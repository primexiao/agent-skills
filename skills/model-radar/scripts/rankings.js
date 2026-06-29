import { isTier1Category } from "./types.js";
const FRONTEND_API_URL = "https://openrouter.ai/api/frontend/v1/models/find";
const RANKINGS_TTL_HOURS = 24;
const FETCH_TIMEOUT_MS = 10_000;
export function extractRankings(models) {
    return models.map((m, i)=>({
            id: m.slug,
            rank: i + 1
        }));
}
export function extractAnalytics(raw, permaToSlug) {
    const result = {};
    for (const [key, val] of Object.entries(raw)){
        const slug = permaToSlug.get(key) ?? key;
        result[slug] = {
            requests: val.count,
            total_tokens: val.total_prompt_tokens + val.total_completion_tokens,
            tool_calls: val.total_tool_calls
        };
    }
    return result;
}
export function extractCategories(raw, permaToSlug) {
    if (!raw) return [];
    const result = [];
    for (const [key, entries] of Object.entries(raw)){
        const slug = permaToSlug.get(key) ?? key;
        for (const entry of entries){
            if (!isTier1Category(entry.category)) continue;
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
function buildOrderUrl(order) {
    const url = new URL(FRONTEND_API_URL);
    url.searchParams.set("active", "true");
    url.searchParams.set("fmt", "cards");
    url.searchParams.set("order", order);
    return url.toString();
}
async function fetchOrder(order) {
    const resp = await fetch(buildOrderUrl(order), {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (!resp.ok) {
        throw new Error(`Frontend API error (order=${order}): ${resp.status} ${resp.statusText}`);
    }
    return await resp.json();
}
export async function fetchRankings() {
    const [popularData, throughputData, latencyData] = await Promise.all([
        fetchOrder("top-weekly"),
        fetchOrder("throughput-high-to-low"),
        fetchOrder("latency-low-to-high")
    ]);
    const permaToSlug = new Map(popularData.data.models.map((m)=>[
            m.permaslug,
            m.slug
        ]));
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
