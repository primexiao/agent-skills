import type { CategoryRanking, RankingsCache, Tier1Category } from "./types";
import { isTier1Category } from "./types";

const FRONTEND_API_URL = "https://openrouter.ai/api/frontend/models/find";
const RANKINGS_TTL_HOURS = 24;
const FETCH_TIMEOUT_MS = 5_000;

// --- Frontend API response types (minimal, only what we use) ---

interface FrontendModel {
  slug: string;
  permaslug: string;
}

interface FrontendAnalyticsEntry {
  count: number;
  total_completion_tokens: number;
  total_prompt_tokens: number;
  total_tool_calls: number;
  [key: string]: unknown;
}

interface FrontendCategoryEntry {
  date: string;
  model: string;       // permaslug-shaped
  category: string;    // expected ∈ Tier1Category
  count: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  volume: number;
  rank: number;
}

interface FrontendResponse {
  data: {
    models: FrontendModel[];
    analytics: Record<string, FrontendAnalyticsEntry>;
    categories?: Record<string, FrontendCategoryEntry[]>;
  };
}

// --- Pure extraction functions (testable without HTTP) ---

export function extractRankings(
  models: Array<{ slug: string }>,
): Array<{ id: string; rank: number }> {
  return models.map((m, i) => ({ id: m.slug, rank: i + 1 }));
}

export function extractAnalytics(
  raw: Record<string, FrontendAnalyticsEntry>,
  permaToSlug: Map<string, string>,
): RankingsCache["analytics"] {
  const result: RankingsCache["analytics"] = {};
  for (const [key, val] of Object.entries(raw)) {
    const slug = permaToSlug.get(key) ?? key;
    result[slug] = {
      requests: val.count,
      total_tokens: val.total_prompt_tokens + val.total_completion_tokens,
      tool_calls: val.total_tool_calls,
    };
  }
  return result;
}

export function extractCategories(
  raw: Record<string, FrontendCategoryEntry[]> | undefined,
  permaToSlug: Map<string, string>,
): CategoryRanking[] {
  if (!raw) return [];
  const result: CategoryRanking[] = [];
  for (const [key, entries] of Object.entries(raw)) {
    const slug = permaToSlug.get(key) ?? key;
    for (const entry of entries) {
      if (!isTier1Category(entry.category)) continue;
      result.push({
        model_id: slug,
        category: entry.category as Tier1Category,
        rank: entry.rank,
        volume: entry.volume,
        count: entry.count,
      });
    }
  }
  return result;
}

// --- HTTP fetch ---

async function fetchOrder(order: string): Promise<FrontendResponse> {
  const resp = await fetch(`${FRONTEND_API_URL}?order=${order}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!resp.ok) {
    throw new Error(`Frontend API error (order=${order}): ${resp.status} ${resp.statusText}`);
  }
  return (await resp.json()) as FrontendResponse;
}

export async function fetchRankings(): Promise<RankingsCache> {
  const [popularData, throughputData, latencyData] = await Promise.all([
    fetchOrder("top-weekly"),
    fetchOrder("throughput-high-to-low"),
    fetchOrder("latency-low-to-high"),
  ]);

  const permaToSlug = new Map(
    popularData.data.models.map((m) => [m.permaslug, m.slug]),
  );

  return {
    metadata: {
      source: FRONTEND_API_URL,
      fetched_at: new Date().toISOString(),
      ttl_hours: RANKINGS_TTL_HOURS,
    },
    popularity: extractRankings(popularData.data.models),
    throughput: extractRankings(throughputData.data.models),
    latency: extractRankings(latencyData.data.models),
    analytics: extractAnalytics(popularData.data.analytics, permaToSlug),
    categories: extractCategories(popularData.data.categories, permaToSlug),
  };
}
