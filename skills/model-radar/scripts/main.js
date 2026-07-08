import { dirname, join } from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { readCache, writeCache, isCacheValid } from "./cache.js";
import { fetchRawModels } from "./fetch.js";
import { enrichModel } from "./enrich.js";
import { filterModels } from "./filter.js";
import { findModelMatch } from "./match.js";
import { scoreModels } from "./score.js";
import { parseTokens } from "./parse.js";
import { fetchRankings } from "./rankings.js";
const DEFAULT_SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_DIR = process.env.MODEL_RADAR_DIR ?? DEFAULT_SKILL_DIR;
const RAW_PATH = join(SKILL_DIR, "cache", "raw.json");
const ENRICHED_PATH = join(SKILL_DIR, "cache", "models.json");
const RANKINGS_PATH = join(SKILL_DIR, "cache", "rankings.json");
const PRESETS_PATH = join(SKILL_DIR, "config", "presets.json");
const SELF_UPDATE_PATH = join(SKILL_DIR, "scripts", "self-update.js");
const MAIN_PATH = fileURLToPath(import.meta.url);
function runSelfUpdate() {
    if (process.env.MODEL_RADAR_SKIP_SELF_UPDATE === "1") return false;
    const result = spawnSync(process.execPath, [
        SELF_UPDATE_PATH,
        "auto"
    ], {
        stdio: [
            "ignore",
            "ignore",
            "pipe"
        ],
        env: process.env
    });
    const stderr = result.stderr?.toString() ?? "";
    if (stderr) process.stderr.write(stderr);
    if (result.error) {
        console.error(`[warn] model-radar self-update failed: ${result.error.message}`);
    } else if (result.status !== 0) {
        console.error(`[warn] model-radar self-update exited with status ${result.status}`);
    }
    return stderr.includes("MODEL_RADAR_UPDATED");
}
function restartAfterSelfUpdate() {
    const result = spawnSync(process.execPath, [
        MAIN_PATH,
        ...process.argv.slice(2)
    ], {
        stdio: "inherit",
        env: {
            ...process.env,
            MODEL_RADAR_SKIP_SELF_UPDATE: "1"
        }
    });
    if (result.error) {
        console.error(`[warn] model-radar restart after self-update failed: ${result.error.message}`);
        process.exit(1);
    }
    process.exit(result.status ?? 0);
}
function loadPresets() {
    const text = readFileSync(PRESETS_PATH, "utf-8");
    return JSON.parse(text);
}
function output(data) {
    console.log(JSON.stringify(data, null, 2));
}
function errorExit(message, code = 1) {
    console.error(JSON.stringify({
        error: message
    }, null, 2));
    process.exit(code);
}
async function getModels(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = readCache(ENRICHED_PATH);
        if (cached && isCacheValid(cached)) return cached;
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
        if (cached && isCacheValid(cached)) return cached;
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
const RANKINGS_SORTS = new Set([
    "popular",
    "throughput",
    "latency"
]);
function augmentWithRankings(model, rankings) {
    if (!rankings) return model;
    const result = {
        ...model
    };
    const popRank = rankings.popularity.find((r)=>r.id === model.id);
    if (popRank) result.popularity_rank = popRank.rank;
    const analytic = rankings.analytics[model.id];
    if (analytic) result.analytics = analytic;
    const bench = rankings.benchmarks?.[model.id];
    if (bench) result.benchmarks = bench;
    const perf = rankings.perf?.[model.id];
    if (perf) result.perf = perf;
    return result;
}
async function handleList(args) {
    const cache = await getModels();
    let models = filterModels(cache.models, args.constraints);
    const rankings = RANKINGS_SORTS.has(args.sort) ? await getRankings() : null;
    switch(args.sort){
        case "new":
            models.sort((a, b)=>b.created - a.created);
            break;
        case "cheap":
            models.sort((a, b)=>a.pricing.blended_per_mtok - b.pricing.blended_per_mtok);
            break;
        case "expensive":
            models.sort((a, b)=>b.pricing.blended_per_mtok - a.pricing.blended_per_mtok);
            break;
        case "ctx":
            models.sort((a, b)=>b.context_length - a.context_length);
            break;
        case "popular":
        case "throughput":
        case "latency":
            {
                const dimension = args.sort === "popular" ? "popularity" : args.sort;
                const rankMap = new Map((rankings?.[dimension] ?? []).map((r)=>[
                        r.id,
                        r.rank
                    ]));
                models.sort((a, b)=>(rankMap.get(a.id) ?? Infinity) - (rankMap.get(b.id) ?? Infinity));
                break;
            }
    }
    const showing = models.slice(0, args.top);
    const augmented = showing.map((m)=>augmentWithRankings(m, rankings));
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
    const constraints = {
        ...args.constraints
    };
    if (!constraints.capabilities?.length && preset.required_capabilities.length) {
        constraints.capabilities = [
            ...preset.required_capabilities
        ];
    } else if (constraints.capabilities?.length) {
        const merged = new Set([
            ...constraints.capabilities,
            ...preset.required_capabilities
        ]);
        constraints.capabilities = [
            ...merged
        ];
    }
    const filtered = filterModels(cache.models, constraints);
    const scored = scoreModels(filtered, preset);
    const top = scored.slice(0, args.top);
    const rankings = await getRankings();
    const recommendations = top.map((s, i)=>({
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
            capabilities: s.model.capabilities,
            ...rankings?.benchmarks?.[s.model.id] ? {
                benchmarks: rankings.benchmarks[s.model.id]
            } : {},
            ...rankings?.perf?.[s.model.id] ? {
                perf: rankings.perf[s.model.id]
            } : {}
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
    for (const query of args.models){
        const match = findModelMatch(cache.models, query);
        if (match) {
            found.push(augmentWithRankings(match, rankings));
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
async function handleTasks(args) {
    const rankings = await getRankings();
    if (!rankings?.tasks) {
        errorExit("No task-spend data in rankings cache. Run `refresh` (needs network) — or the endpoint may be unavailable.");
    }
    const { window_days, macro_categories, tasks } = rankings.tasks;
    const sorted = [
        ...tasks
    ].sort((a, b)=>b.spend_share_of_total - a.spend_share_of_total);
    if (!args.tag) {
        output({
            command: "tasks",
            window_days,
            fetched_at: rankings.metadata.fetched_at,
            macro_categories,
            tasks: sorted.map((t)=>({
                    tag: t.tag,
                    macro: t.macro,
                    spend_share_of_total: t.spend_share_of_total,
                    top_model: t.top_models[0] ?? null
                }))
        });
        return;
    }
    // ponytail: alias map only for words substring-matching can't reach ("coding" does not contain "code")
    const TASK_ALIASES = {
        coding: "code",
        programming: "code",
        program: "code"
    };
    const raw = args.tag.toLowerCase();
    const needle = TASK_ALIASES[raw] ?? raw;
    const matched = sorted.filter((t)=>{
        const macro = t.macro.toLowerCase();
        return t.tag.toLowerCase().includes(needle) || macro.includes(needle) || needle.includes(macro);
    });
    if (!matched.length) {
        errorExit(`No task matching "${args.tag}". Available: ${sorted.map((t)=>t.tag).join(", ")}`);
    }
    // join model metadata so one command yields a full recommendation table
    const cache = await getModels();
    const modelById = new Map(cache.models.map((m)=>[
            m.id,
            m
        ]));
    const enriched = matched.map((t)=>({
            ...t,
            top_models: t.top_models.map((tm)=>{
                const m = modelById.get(tm.id);
                if (!m) return tm;
                return {
                    ...tm,
                    name: m.name,
                    blended_per_mtok: m.pricing.blended_per_mtok,
                    context_length: m.context_length,
                    ...rankings.benchmarks?.[tm.id] ? {
                        benchmarks: rankings.benchmarks[tm.id]
                    } : {}
                };
            })
        }));
    output({
        command: "tasks",
        window_days,
        fetched_at: rankings.metadata.fetched_at,
        tasks: enriched
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
            benchmarks_count: Object.keys(rankings.benchmarks ?? {}).length,
            tasks_count: rankings.tasks?.tasks?.length ?? 0,
            fetched_at: rankings.metadata.fetched_at
        } : null
    });
}
async function main() {
    try {
        if (runSelfUpdate()) restartAfterSelfUpdate();
        const args = parseTokens(process.argv.slice(2));
        switch(args.command){
            case "list":
                await handleList(args);
                break;
            case "recommend":
                await handleRecommend(args);
                break;
            case "compare":
                await handleCompare(args);
                break;
            case "tasks":
                await handleTasks(args);
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
