// scripts/main.ts
import { dirname as dirname2, join } from "path";
import { readFileSync as readFileSync2 } from "fs";
import { fileURLToPath } from "url";

// scripts/cache.ts
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
function readCache(path) {
  try {
    if (!existsSync(path))
      return null;
    const text = readFileSync(path, "utf-8");
    const data = JSON.parse(text);
    if (!data.metadata?.fetched_at || !data.metadata?.ttl_hours)
      return null;
    return data;
  } catch {
    try {
      rmSync(path, { force: true });
    } catch {}
    return null;
  }
}
function writeCache(path, data) {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}
function isCacheValid(cache) {
  const fetchedAt = new Date(cache.metadata.fetched_at).getTime();
  const ttlMs = cache.metadata.ttl_hours * 60 * 60 * 1000;
  return Date.now() - fetchedAt < ttlMs;
}

// scripts/fetch.ts
var API_URL = "https://openrouter.ai/api/v1/models";
var TTL_HOURS = 6;
var FETCH_TIMEOUT_MS = 5000;
async function fetchRawModels() {
  const response = await fetch(API_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }
  const apiResponse = await response.json();
  return {
    metadata: {
      source: API_URL,
      fetched_at: new Date().toISOString(),
      ttl_hours: TTL_HOURS,
      total_models: apiResponse.data.length
    },
    data: apiResponse.data
  };
}

// scripts/enrich.ts
var PER_MTOK = 1e6;
function calculatePricing(raw, promptWeight = 0.4, completionWeight = 0.6) {
  const prompt_per_mtok = parseFloat(raw.prompt) * PER_MTOK;
  const completion_per_mtok = parseFloat(raw.completion) * PER_MTOK;
  const blended_per_mtok = prompt_per_mtok * promptWeight + completion_per_mtok * completionWeight;
  const cache_read_per_mtok = raw.input_cache_read != null ? parseFloat(raw.input_cache_read) * PER_MTOK : null;
  const cache_write_per_mtok = raw.input_cache_write != null ? parseFloat(raw.input_cache_write) * PER_MTOK : null;
  const web_search_per_request = raw.web_search != null ? parseFloat(raw.web_search) : null;
  return {
    prompt_per_mtok,
    completion_per_mtok,
    blended_per_mtok,
    cache_read_per_mtok,
    cache_write_per_mtok,
    web_search_per_request
  };
}
function extractCapabilities(supportedParams, inputModalities, outputModalities, maxCompletionTokens, pricing) {
  const caps = [];
  if (supportedParams.includes("tools") && supportedParams.includes("tool_choice")) {
    caps.push("tool_use");
  }
  if (supportedParams.includes("reasoning") || supportedParams.includes("include_reasoning")) {
    caps.push("reasoning");
  }
  if (supportedParams.includes("structured_outputs") || supportedParams.includes("response_format")) {
    caps.push("structured_output");
  }
  if (inputModalities.includes("image")) {
    caps.push("vision");
  }
  if (maxCompletionTokens != null && maxCompletionTokens >= 32000) {
    caps.push("long_output");
  }
  const cacheRead = pricing.input_cache_read != null ? parseFloat(pricing.input_cache_read) : 0;
  const cacheWrite = pricing.input_cache_write != null ? parseFloat(pricing.input_cache_write) : 0;
  if (cacheRead > 0 || cacheWrite > 0) {
    caps.push("prompt_caching");
  }
  const webSearch = pricing.web_search != null ? parseFloat(pricing.web_search) : 0;
  if (webSearch > 0) {
    caps.push("web_search");
  }
  if (inputModalities.includes("audio")) {
    caps.push("audio_input");
  }
  if (inputModalities.includes("video")) {
    caps.push("video_input");
  }
  if (inputModalities.includes("file")) {
    caps.push("file_input");
  }
  if (outputModalities.includes("image")) {
    caps.push("image_generation");
  }
  if (outputModalities.includes("audio")) {
    caps.push("audio_output");
  }
  return caps;
}
function enrichModel(raw) {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    created: raw.created,
    context_length: raw.context_length,
    max_completion_tokens: raw.top_provider.max_completion_tokens,
    modality: raw.architecture.modality,
    input_modalities: raw.architecture.input_modalities,
    output_modalities: raw.architecture.output_modalities,
    is_moderated: raw.top_provider.is_moderated,
    is_open_source: raw.hugging_face_id != null,
    pricing: calculatePricing(raw.pricing),
    capabilities: extractCapabilities(raw.supported_parameters, raw.architecture.input_modalities, raw.architecture.output_modalities, raw.top_provider.max_completion_tokens, raw.pricing),
    supported_parameters: raw.supported_parameters
  };
}

// scripts/filter.ts
function matchesRange(value, range) {
  if (range.min !== undefined && value < range.min)
    return false;
  if (range.max !== undefined && value > range.max)
    return false;
  return true;
}
function filterModels(models, constraints) {
  return models.filter((model) => {
    if (constraints.price && !matchesRange(model.pricing.blended_per_mtok, constraints.price)) {
      return false;
    }
    if (constraints.context && !matchesRange(model.context_length, constraints.context)) {
      return false;
    }
    if (constraints.output) {
      if (model.max_completion_tokens === null)
        return false;
      if (!matchesRange(model.max_completion_tokens, constraints.output))
        return false;
    }
    if (constraints.capabilities) {
      for (const cap of constraints.capabilities) {
        if (!model.capabilities.includes(cap))
          return false;
      }
    }
    if (constraints.input_modalities) {
      for (const mod of constraints.input_modalities) {
        if (!model.input_modalities.includes(mod))
          return false;
      }
    }
    if (constraints.output_modalities) {
      for (const mod of constraints.output_modalities) {
        if (!model.output_modalities.includes(mod))
          return false;
      }
    }
    if (constraints.open_source !== undefined && model.is_open_source !== constraints.open_source) {
      return false;
    }
    return true;
  });
}

// scripts/match.ts
function findModelMatch(models, query) {
  const q = query.trim().toLowerCase();
  if (!q)
    return null;
  const exact = models.find((m) => m.id.toLowerCase() === q);
  if (exact)
    return exact;
  const suffix = "/" + q;
  const suffixHits = models.filter((m) => m.id.toLowerCase().endsWith(suffix));
  if (suffixHits.length > 0) {
    return suffixHits.reduce((a, b) => b.created > a.created ? b : a);
  }
  const partialHits = models.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
  if (partialHits.length === 0)
    return null;
  return partialHits.reduce((a, b) => b.created > a.created ? b : a);
}

// scripts/score.ts
var MAX_INVERSE_PRICE = 1e9;
function normalize(value, min, max) {
  if (max === min)
    return 0;
  return (value - min) / (max - min);
}
function scoreModels(models, preset) {
  if (models.length === 0)
    return [];
  const { weights, required_capabilities } = preset;
  const inversePrices = models.map((m) => m.pricing.blended_per_mtok === 0 ? MAX_INVERSE_PRICE : 1 / m.pricing.blended_per_mtok);
  const contextLengths = models.map((m) => m.context_length);
  const outputLengths = models.map((m) => m.max_completion_tokens ?? 0);
  const ipMin = Math.min(...inversePrices);
  const ipMax = Math.max(...inversePrices);
  const ctxMin = Math.min(...contextLengths);
  const ctxMax = Math.max(...contextLengths);
  const outMin = Math.min(...outputLengths);
  const outMax = Math.max(...outputLengths);
  const scored = models.map((model, i) => {
    const costScore = normalize(inversePrices[i], ipMin, ipMax);
    const contextScore = normalize(contextLengths[i], ctxMin, ctxMax);
    const outputScore = normalize(outputLengths[i], outMin, outMax);
    let capabilityScore;
    if (required_capabilities.length === 0) {
      capabilityScore = 1;
    } else {
      const matched = required_capabilities.filter((cap) => model.capabilities.includes(cap)).length;
      capabilityScore = matched / required_capabilities.length;
    }
    const score = weights.cost * costScore + weights.context * contextScore + weights.output * outputScore + weights.capability * capabilityScore;
    return {
      model,
      score,
      score_breakdown: {
        cost: costScore,
        context: contextScore,
        output: outputScore,
        capability: capabilityScore
      }
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// scripts/parse.ts
var SORT_VALUES = new Set([
  "cheap",
  "expensive",
  "popular",
  "new",
  "ctx",
  "throughput",
  "latency"
]);
function parseNumericSuffix(value) {
  const lower = value.toLowerCase();
  if (lower.endsWith("m"))
    return parseFloat(lower.slice(0, -1)) * 1e6;
  if (lower.endsWith("k"))
    return parseFloat(lower.slice(0, -1)) * 1000;
  return parseFloat(value);
}
function parseRange(value, bareDefault) {
  if (value.includes("..")) {
    const dotIdx = value.indexOf("..");
    const minStr = value.slice(0, dotIdx);
    const maxStr = value.slice(dotIdx + 2);
    return {
      min: minStr ? parseNumericSuffix(minStr) : undefined,
      max: maxStr ? parseNumericSuffix(maxStr) : undefined
    };
  }
  const num = parseNumericSuffix(value);
  return bareDefault === "max" ? { max: num } : { min: num };
}
function parseTokens(args) {
  const command = args[0] ?? "list";
  if (command === "compare") {
    return { command: "compare", models: args.slice(1) };
  }
  if (command === "refresh") {
    return { command: "refresh" };
  }
  const isRecommend = command === "recommend";
  const tokens = args.slice(1);
  const constraints = {};
  let sort = "new";
  let top = isRecommend ? 3 : 20;
  let preset = "coding";
  for (const token of tokens) {
    const colonIdx = token.indexOf(":");
    if (colonIdx === -1)
      continue;
    const key = token.slice(0, colonIdx);
    const value = token.slice(colonIdx + 1);
    switch (key) {
      case "sort":
        if (SORT_VALUES.has(value))
          sort = value;
        break;
      case "price":
        constraints.price = parseRange(value, "max");
        break;
      case "ctx":
        constraints.context = parseRange(value, "min");
        break;
      case "out":
        constraints.output = parseRange(value, "min");
        break;
      case "cap":
        constraints.capabilities = value.split(",").map((s) => s.trim());
        break;
      case "in":
        constraints.input_modalities = value.split(",").map((s) => s.trim());
        break;
      case "gen":
        constraints.output_modalities = value.split(",").map((s) => s.trim());
        break;
      case "open":
        constraints.open_source = value === "true";
        break;
      case "top":
        top = parseInt(value, 10);
        break;
      case "preset":
        preset = value;
        break;
    }
  }
  if (isRecommend) {
    return { command: "recommend", top, preset, constraints };
  }
  return { command: "list", top, sort, constraints };
}

// scripts/types.ts
var TIER1_CATEGORIES = [
  "academia",
  "finance",
  "health",
  "legal",
  "marketing",
  "marketing/seo",
  "programming",
  "roleplay",
  "science",
  "technology",
  "translation",
  "trivia"
];
function isTier1Category(value) {
  return TIER1_CATEGORIES.includes(value);
}

// scripts/rankings.ts
var FRONTEND_API_URL = "https://openrouter.ai/api/frontend/models/find";
var RANKINGS_TTL_HOURS = 24;
var FETCH_TIMEOUT_MS2 = 5000;
function extractRankings(models) {
  return models.map((m, i) => ({ id: m.slug, rank: i + 1 }));
}
function extractAnalytics(raw, permaToSlug) {
  const result = {};
  for (const [key, val] of Object.entries(raw)) {
    const slug = permaToSlug.get(key) ?? key;
    result[slug] = {
      requests: val.count,
      total_tokens: val.total_prompt_tokens + val.total_completion_tokens,
      tool_calls: val.total_tool_calls
    };
  }
  return result;
}
function extractCategories(raw, permaToSlug) {
  if (!raw)
    return [];
  const result = [];
  for (const [key, entries] of Object.entries(raw)) {
    const slug = permaToSlug.get(key) ?? key;
    for (const entry of entries) {
      if (!isTier1Category(entry.category))
        continue;
      result.push({
        model_id: slug,
        category: entry.category,
        rank: entry.rank,
        volume: entry.volume,
        count: entry.count
      });
    }
  }
  return result;
}
async function fetchOrder(order) {
  const resp = await fetch(`${FRONTEND_API_URL}?order=${order}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS2)
  });
  if (!resp.ok) {
    throw new Error(`Frontend API error (order=${order}): ${resp.status} ${resp.statusText}`);
  }
  return await resp.json();
}
async function fetchRankings() {
  const [popularData, throughputData, latencyData] = await Promise.all([
    fetchOrder("top-weekly"),
    fetchOrder("throughput-high-to-low"),
    fetchOrder("latency-low-to-high")
  ]);
  const permaToSlug = new Map(popularData.data.models.map((m) => [m.permaslug, m.slug]));
  return {
    metadata: {
      source: FRONTEND_API_URL,
      fetched_at: new Date().toISOString(),
      ttl_hours: RANKINGS_TTL_HOURS
    },
    popularity: extractRankings(popularData.data.models),
    throughput: extractRankings(throughputData.data.models),
    latency: extractRankings(latencyData.data.models),
    analytics: extractAnalytics(popularData.data.analytics, permaToSlug),
    categories: extractCategories(popularData.data.categories, permaToSlug)
  };
}

// scripts/main.ts
var SKILL_DIR = join(dirname2(fileURLToPath(import.meta.url)), "..");
var RAW_PATH = join(SKILL_DIR, "cache", "raw.json");
var ENRICHED_PATH = join(SKILL_DIR, "cache", "models.json");
var RANKINGS_PATH = join(SKILL_DIR, "cache", "rankings.json");
var PRESETS_PATH = join(SKILL_DIR, "config", "presets.json");
function loadPresets() {
  const text = readFileSync2(PRESETS_PATH, "utf-8");
  return JSON.parse(text);
}
function output(data) {
  console.log(JSON.stringify(data, null, 2));
}
function errorExit(message, code = 1) {
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exit(code);
}
async function getModels(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = readCache(ENRICHED_PATH);
    if (cached && isCacheValid(cached))
      return cached;
  }
  try {
    const raw = await fetchRawModels();
    writeCache(RAW_PATH, raw);
    const enriched = {
      metadata: {
        source: raw.metadata.source,
        fetched_at: raw.metadata.fetched_at,
        ttl_hours: raw.metadata.ttl_hours,
        total_models: raw.metadata.total_models,
        enriched: true
      },
      models: raw.data.map(enrichModel)
    };
    writeCache(ENRICHED_PATH, enriched);
    return enriched;
  } catch (err) {
    const stale = readCache(ENRICHED_PATH);
    if (stale) {
      console.error(`[warn] API fetch failed, using stale cache from ${stale.metadata.fetched_at}`);
      return stale;
    }
    throw err;
  }
}
async function getRankings(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = readCache(RANKINGS_PATH);
    if (cached && isCacheValid(cached))
      return cached;
  }
  try {
    const rankings = await fetchRankings();
    writeCache(RANKINGS_PATH, rankings);
    return rankings;
  } catch (err) {
    console.error(`[warn] Rankings fetch failed: ${err instanceof Error ? err.message : err}`);
    const stale = readCache(RANKINGS_PATH);
    return stale;
  }
}
var RANKINGS_SORTS = new Set(["popular", "throughput", "latency"]);
async function handleList(args) {
  const cache = await getModels();
  let models = filterModels(cache.models, args.constraints);
  const rankings = RANKINGS_SORTS.has(args.sort) ? await getRankings() : null;
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
      const rankMap = new Map((rankings?.[dimension] ?? []).map((r) => [r.id, r.rank]));
      models.sort((a, b) => (rankMap.get(a.id) ?? Infinity) - (rankMap.get(b.id) ?? Infinity));
      break;
    }
  }
  const showing = models.slice(0, args.top);
  const augmented = showing.map((m) => {
    const result = { ...m };
    if (rankings) {
      const popRank = rankings.popularity.find((r) => r.id === m.id);
      if (popRank)
        result.popularity_rank = popRank.rank;
      const analytic = rankings.analytics[m.id];
      if (analytic)
        result.analytics = analytic;
    }
    return result;
  });
  output({
    command: "list",
    sort: args.sort,
    total: models.length,
    showing: showing.length,
    fetched_at: cache.metadata.fetched_at,
    models: augmented
  });
}
async function handleRecommend(args) {
  const cache = await getModels();
  const presetsConfig = loadPresets();
  const preset = presetsConfig.presets[args.preset];
  if (!preset) {
    errorExit(`Unknown preset: ${args.preset}. Available: ${Object.keys(presetsConfig.presets).join(", ")}`);
  }
  const constraints = { ...args.constraints };
  if (!constraints.capabilities?.length && preset.required_capabilities.length) {
    constraints.capabilities = [...preset.required_capabilities];
  } else if (constraints.capabilities?.length) {
    const merged = new Set([...constraints.capabilities, ...preset.required_capabilities]);
    constraints.capabilities = [...merged];
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
      capability: Math.round(s.score_breakdown.capability * 1000) / 1000
    },
    pricing: s.model.pricing,
    context_length: s.model.context_length,
    max_completion_tokens: s.model.max_completion_tokens,
    input_modalities: s.model.input_modalities,
    output_modalities: s.model.output_modalities,
    capabilities: s.model.capabilities
  }));
  output({
    command: "recommend",
    preset: args.preset,
    constraints,
    total_models: cache.models.length,
    filtered: filtered.length,
    fetched_at: cache.metadata.fetched_at,
    recommendations
  });
}
async function handleCompare(args) {
  const cache = await getModels();
  const rankings = await getRankings();
  const found = [];
  const notFound = [];
  for (const query of args.models) {
    const match = findModelMatch(cache.models, query);
    if (match) {
      const aug = { ...match };
      if (rankings) {
        const popRank = rankings.popularity.find((r) => r.id === match.id);
        if (popRank)
          aug.popularity_rank = popRank.rank;
        const analytic = rankings.analytics[match.id];
        if (analytic)
          aug.analytics = analytic;
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
    not_found: notFound
  });
}
async function handleRefresh() {
  const [cache, rankings] = await Promise.all([
    getModels(true),
    getRankings(true)
  ]);
  output({
    command: "refresh",
    message: "All caches refreshed",
    models: {
      total: cache.metadata.total_models,
      fetched_at: cache.metadata.fetched_at
    },
    rankings: rankings ? {
      popularity_count: rankings.popularity.length,
      analytics_count: Object.keys(rankings.analytics).length,
      fetched_at: rankings.metadata.fetched_at
    } : null
  });
}
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
