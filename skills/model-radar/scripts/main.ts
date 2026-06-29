import { dirname, join } from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

import type {
  CliArgs,
  EnrichedModel,
  ModelCache,
  PresetsConfig,
  Preset,
  Capability,
  RankingsCache,
  RawCache,
  SortOrder,
} from "./types";
import { readCache, writeCache, isCacheValid } from "./cache";
import { fetchRawModels } from "./fetch";
import { enrichModel } from "./enrich";
import { filterModels } from "./filter";
import { findModelMatch } from "./match";
import { scoreModels } from "./score";
import { parseTokens } from "./parse";
import { fetchRankings } from "./rankings";

// --- Paths ---

const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_PATH = join(SKILL_DIR, "cache", "raw.json");
const ENRICHED_PATH = join(SKILL_DIR, "cache", "models.json");
const RANKINGS_PATH = join(SKILL_DIR, "cache", "rankings.json");
const PRESETS_PATH = join(SKILL_DIR, "config", "presets.json");

// --- Helpers ---

function loadPresets(): PresetsConfig {
  const text = readFileSync(PRESETS_PATH, "utf-8");
  return JSON.parse(text) as PresetsConfig;
}

function output(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function errorExit(message: string, code = 1): never {
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exit(code);
}

/**
 * Try enriched cache first (if valid), else fetch raw → enrich → write both caches.
 * On fetch error, fallback to stale enriched cache.
 */
async function getModels(forceRefresh = false): Promise<ModelCache> {
  if (!forceRefresh) {
    const cached = readCache<ModelCache>(ENRICHED_PATH);
    if (cached && isCacheValid(cached)) return cached;
  }

  try {
    const raw = await fetchRawModels();
    writeCache(RAW_PATH, raw);

    const enriched: ModelCache = {
      metadata: {
        source: raw.metadata.source,
        fetched_at: raw.metadata.fetched_at,
        ttl_hours: raw.metadata.ttl_hours,
        total_models: raw.metadata.total_models,
        enriched: true,
      },
      models: raw.data.map(enrichModel),
    };
    writeCache(ENRICHED_PATH, enriched);
    return enriched;
  } catch (err) {
    const stale = readCache<ModelCache>(ENRICHED_PATH);
    if (stale) {
      console.error(`[warn] API fetch failed, using stale cache from ${stale.metadata.fetched_at}`);
      return stale;
    }
    throw err;
  }
}

/**
 * Fetch rankings only when needed (popular/throughput/latency sorts).
 * Cached with 24h TTL. Gracefully returns null on failure.
 */
async function getRankings(forceRefresh = false): Promise<RankingsCache | null> {
  if (!forceRefresh) {
    const cached = readCache<RankingsCache>(RANKINGS_PATH);
    if (cached && isCacheValid(cached)) return cached;
  }

  try {
    const rankings = await fetchRankings();
    writeCache(RANKINGS_PATH, rankings);
    return rankings;
  } catch (err) {
    console.error(`[warn] Rankings fetch failed: ${err instanceof Error ? err.message : err}`);
    const stale = readCache<RankingsCache>(RANKINGS_PATH);
    return stale;
  }
}

const RANKINGS_SORTS = new Set<SortOrder>(["popular", "throughput", "latency"]);

// --- Command handlers ---

async function handleList(args: Extract<CliArgs, { command: "list" }>) {
  const cache = await getModels();
  let models = filterModels(cache.models, args.constraints);

  // Lazy-load rankings only if needed
  const rankings = RANKINGS_SORTS.has(args.sort)
    ? await getRankings()
    : null;

  switch (args.sort) {
    case "new":
      models.sort((a, b) => b.created - a.created);
      break;
    case "cheap":
      models.sort((a, b) => a.pricing.blended_per_mtok - b.pricing.blended_per_mtok);
      break;
    case "expensive":
      models.sort((a, b) => b.pricing.blended_per_mtok - a.pricing.blended_per_mtok);
      break;
    case "ctx":
      models.sort((a, b) => b.context_length - a.context_length);
      break;
    case "popular":
    case "throughput":
    case "latency": {
      const dimension = args.sort === "popular" ? "popularity" : args.sort;
      const rankMap = new Map(
        (rankings?.[dimension] ?? []).map((r) => [r.id, r.rank]),
      );
      models.sort(
        (a, b) => (rankMap.get(a.id) ?? Infinity) - (rankMap.get(b.id) ?? Infinity),
      );
      break;
    }
  }

  const showing = models.slice(0, args.top);

  // Augment with analytics if rankings available
  const augmented = showing.map((m) => {
    const result: Record<string, unknown> = { ...m };
    if (rankings) {
      const popRank = rankings.popularity.find((r) => r.id === m.id);
      if (popRank) result.popularity_rank = popRank.rank;
      const analytic = rankings.analytics[m.id];
      if (analytic) result.analytics = analytic;
    }
    return result;
  });

  output({
    command: "list",
    sort: args.sort,
    total: models.length,
    showing: showing.length,
    fetched_at: cache.metadata.fetched_at,
    models: augmented,
  });
}

async function handleRecommend(args: Extract<CliArgs, { command: "recommend" }>) {
  const cache = await getModels();
  const presetsConfig = loadPresets();
  const preset = presetsConfig.presets[args.preset];
  if (!preset) {
    errorExit(`Unknown preset: ${args.preset}. Available: ${Object.keys(presetsConfig.presets).join(", ")}`);
  }

  // Merge preset's required_capabilities with explicit cap filter
  const constraints = { ...args.constraints };
  if (!constraints.capabilities?.length && preset.required_capabilities.length) {
    constraints.capabilities = [...preset.required_capabilities];
  } else if (constraints.capabilities?.length) {
    const merged = new Set([...constraints.capabilities, ...preset.required_capabilities]);
    constraints.capabilities = [...merged] as Capability[];
  }

  const filtered = filterModels(cache.models, constraints);
  const scored = scoreModels(filtered, preset);
  const top = scored.slice(0, args.top);

  const recommendations = top.map((s, i) => ({
    rank: i + 1,
    id: s.model.id,
    name: s.model.name,
    score: Math.round(s.score * 1000) / 1000,
    score_breakdown: {
      cost: Math.round(s.score_breakdown.cost * 1000) / 1000,
      context: Math.round(s.score_breakdown.context * 1000) / 1000,
      output: Math.round(s.score_breakdown.output * 1000) / 1000,
      capability: Math.round(s.score_breakdown.capability * 1000) / 1000,
    },
    pricing: s.model.pricing,
    context_length: s.model.context_length,
    max_completion_tokens: s.model.max_completion_tokens,
    input_modalities: s.model.input_modalities,
    output_modalities: s.model.output_modalities,
    capabilities: s.model.capabilities,
  }));

  output({
    command: "recommend",
    preset: args.preset,
    constraints,
    total_models: cache.models.length,
    filtered: filtered.length,
    fetched_at: cache.metadata.fetched_at,
    recommendations,
  });
}

async function handleCompare(args: Extract<CliArgs, { command: "compare" }>) {
  const cache = await getModels();
  const rankings = await getRankings();
  const found: Record<string, unknown>[] = [];
  const notFound: string[] = [];

  for (const query of args.models) {
    const match = findModelMatch(cache.models, query);
    if (match) {
      const aug: Record<string, unknown> = { ...match };
      if (rankings) {
        const popRank = rankings.popularity.find((r) => r.id === match.id);
        if (popRank) aug.popularity_rank = popRank.rank;
        const analytic = rankings.analytics[match.id];
        if (analytic) aug.analytics = analytic;
      }
      found.push(aug);
    } else {
      notFound.push(query);
    }
  }

  output({
    command: "compare",
    fetched_at: cache.metadata.fetched_at,
    models: found,
    not_found: notFound,
  });
}

async function handleRefresh() {
  const [cache, rankings] = await Promise.all([
    getModels(true),
    getRankings(true),
  ]);

  output({
    command: "refresh",
    message: "All caches refreshed",
    models: {
      total: cache.metadata.total_models,
      fetched_at: cache.metadata.fetched_at,
    },
    rankings: rankings
      ? {
          popularity_count: rankings.popularity.length,
          analytics_count: Object.keys(rankings.analytics).length,
          fetched_at: rankings.metadata.fetched_at,
        }
      : null,
  });
}

// --- Main ---

async function main() {
  try {
    const args = parseTokens(process.argv.slice(2));
    switch (args.command) {
      case "list":
        await handleList(args);
        break;
      case "recommend":
        await handleRecommend(args);
        break;
      case "compare":
        await handleCompare(args);
        break;
      case "refresh":
        await handleRefresh();
        break;
    }
  } catch (err) {
    errorExit(err instanceof Error ? err.message : String(err));
  }
}

main();
