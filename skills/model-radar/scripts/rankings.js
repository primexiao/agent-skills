import { isTier1Category } from "./types.js";
const FRONTEND_API_URL = "https://openrouter.ai/api/frontend/v1/models/find";
const TASK_SPEND_API_URL = "https://openrouter.ai/api/frontend/v1/rankings/task-spend";
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
            tool_calls: val.total_tool_calls,
            tool_call_error_requests: val.requests_with_tool_call_errors ?? 0,
            reasoning_tokens: val.total_native_tokens_reasoning ?? 0,
            cached_tokens: val.total_native_tokens_cached ?? 0
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
export function extractBenchmarks(raw, permaToSlug) {
    if (!raw) return {};
    const result = {};
    for (const [key, val] of Object.entries(raw)){
        const slug = permaToSlug.get(key) ?? key;
        const entry = {};
        if (val.aa) {
            entry.intelligence = val.aa.intelligence_index ?? null;
            entry.coding = val.aa.coding_index ?? null;
            entry.agentic = val.aa.agentic_index ?? null;
        }
        if (val.da) entry.design_elo = val.da.max_elo ?? null;
        if (Object.keys(entry).length) result[slug] = entry;
    }
    return result;
}
export function extractPerf(raw, models) {
    if (!raw) return {};
    const endpointToSlug = new Map();
    for (const m of models){
        if (m.endpoint?.id) endpointToSlug.set(m.endpoint.id, m.slug);
    }
    const result = {};
    for (const [endpointId, val] of Object.entries(raw)){
        const slug = endpointToSlug.get(endpointId);
        if (!slug) continue;
        result[slug] = {
            p50_latency_ms: val.p50_latency ?? null,
            p50_throughput_tps: val.p50_throughput ?? null,
            request_count: val.request_count ?? null
        };
    }
    return result;
}
export function extractTasks(raw, permaToSlug) {
    if (!raw?.spend) return null;
    const spend = raw.spend;
    return {
        window_days: spend.windowDays ?? null,
        macro_categories: (spend.macroCategories ?? []).map((c)=>({
                key: c.key,
                label: c.label,
                spend_share: c.spendShare
            })),
        tasks: (spend.tasks ?? []).map((t)=>({
                tag: t.tag,
                macro: t.macroCategory,
                spend_share_of_total: t.spendShareOfTotal,
                top_models: (t.models ?? []).map((m)=>({
                        id: permaToSlug.get(m.model) ?? m.model,
                        spend_share: m.share
                    }))
            }))
    };
}
function buildOrderUrl(order) {
    const url = new URL(FRONTEND_API_URL);
    url.searchParams.set("active", "true");
    url.searchParams.set("fmt", "cards");
    url.searchParams.set("order", order);
    return url.toString();
}
async function fetchJson(url) {
    const resp = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (!resp.ok) {
        throw new Error(`Frontend API error (${url}): ${resp.status} ${resp.statusText}`);
    }
    return await resp.json();
}
async function fetchOrder(order) {
    return fetchJson(buildOrderUrl(order));
}
export async function fetchRankings() {
    const [popularData, throughputData, latencyData, taskSpendData] = await Promise.all([
        fetchOrder("top-weekly"),
        fetchOrder("throughput-high-to-low"),
        fetchOrder("latency-low-to-high"),
        // task-spend is a newer endpoint; tolerate failure so rankings still work
        fetchJson(TASK_SPEND_API_URL).catch((err)=>{
            console.error(`[warn] task-spend fetch failed: ${err instanceof Error ? err.message : err}`);
            return null;
        })
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
        categories: extractCategories(popularData.data.categories, permaToSlug),
        benchmarks: extractBenchmarks(popularData.data.benchmarks, permaToSlug),
        perf: extractPerf(popularData.data.endpoint_perf, popularData.data.models),
        tasks: taskSpendData ? extractTasks(taskSpendData.data, permaToSlug) : null
    };
}
