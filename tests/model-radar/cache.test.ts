import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { readCache, writeCache, isCacheValid } from "../../skills/model-radar/scripts/cache";
import type { ModelCache, RawCache, RankingsCache } from "../../skills/model-radar/scripts/types";

const TEST_DIR = join(import.meta.dir, "../../.test-cache");
const TEST_FILE = join(TEST_DIR, "models.json");

function makeCache(overrides: Partial<ModelCache["metadata"]> = {}): ModelCache {
  return {
    metadata: {
      source: "https://openrouter.ai/api/v1/models",
      fetched_at: new Date().toISOString(),
      ttl_hours: 6,
      total_models: 1,
      enriched: true,
      ...overrides,
    },
    models: [
      {
        id: "test/model-1",
        name: "Test Model",
        description: "A test model",
        created: 1700000000,
        context_length: 128000,
        max_completion_tokens: 4096,
        modality: "text->text",
        is_moderated: false,
        is_open_source: false,
        pricing: {
          prompt_per_mtok: 3,
          completion_per_mtok: 15,
          blended_per_mtok: 10.2,
          cache_read_per_mtok: null,
          cache_write_per_mtok: null,
          web_search_per_request: null,
        },
        capabilities: ["tool_use"],
        supported_parameters: ["tools", "tool_choice"],
      },
    ],
  };
}

// ============================================================
// Setup / Teardown
// ============================================================

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

// ============================================================
// writeCache + readCache round-trip
// ============================================================

describe("writeCache + readCache", () => {
  it("round-trips a ModelCache through write and read", () => {
    const cache = makeCache();
    writeCache(TEST_FILE, cache);
    const loaded = readCache(TEST_FILE);

    expect(loaded).not.toBeNull();
    expect(loaded!.metadata.source).toBe(cache.metadata.source);
    expect(loaded!.metadata.ttl_hours).toBe(6);
    expect(loaded!.models).toHaveLength(1);
    expect(loaded!.models[0].id).toBe("test/model-1");
  });
});

// ============================================================
// readCache
// ============================================================

describe("readCache", () => {
  it("returns null for non-existent file", () => {
    const result = readCache(join(TEST_DIR, "does-not-exist.json"));
    expect(result).toBeNull();
  });

  it("returns null for corrupted JSON and removes the file", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, "NOT VALID JSON {{{");

    const result = readCache(TEST_FILE);
    expect(result).toBeNull();
    expect(existsSync(TEST_FILE)).toBe(false);
  });

  it("returns null for valid JSON that lacks metadata", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, JSON.stringify({ models: [] }));

    const result = readCache(TEST_FILE);
    expect(result).toBeNull();
  });

  it("returns null for valid JSON that lacks metadata fields", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(
      TEST_FILE,
      JSON.stringify({ metadata: { source: "x" } }),
    );

    const result = readCache(TEST_FILE);
    expect(result).toBeNull();
  });
});

// ============================================================
// isCacheValid
// ============================================================

describe("isCacheValid", () => {
  it("returns true for a fresh cache (just created)", () => {
    const cache = makeCache({ ttl_hours: 6 });
    expect(isCacheValid(cache)).toBe(true);
  });

  it("returns false for an expired cache (> TTL hours ago)", () => {
    const expired = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();
    const cache = makeCache({ fetched_at: expired, ttl_hours: 6 });
    expect(isCacheValid(cache)).toBe(false);
  });

  it("returns true when exactly at the boundary minus 1ms", () => {
    // 6 hours minus 1 second — still valid
    const almostExpired = new Date(Date.now() - (6 * 60 * 60 * 1000 - 1000)).toISOString();
    const cache = makeCache({ fetched_at: almostExpired, ttl_hours: 6 });
    expect(isCacheValid(cache)).toBe(true);
  });
});

describe("generic cache support", () => {
  it("round-trips a RawCache through write and read", () => {
    const raw: RawCache = {
      metadata: {
        source: "https://openrouter.ai/api/v1/models",
        fetched_at: new Date().toISOString(),
        ttl_hours: 6,
        total_models: 1,
      },
      data: [],
    };
    writeCache(TEST_FILE, raw);
    const loaded = readCache<RawCache>(TEST_FILE);

    expect(loaded).not.toBeNull();
    expect(loaded!.metadata.source).toBe(raw.metadata.source);
    expect(loaded!.metadata.total_models).toBe(1);
    expect(loaded!.data).toEqual([]);
  });

  it("round-trips a RankingsCache through write and read", () => {
    const rankings: RankingsCache = {
      metadata: {
        source: "https://openrouter.ai/api/frontend/models/find",
        fetched_at: new Date().toISOString(),
        ttl_hours: 24,
      },
      popularity: [{ id: "deepseek/deepseek-v3.2", rank: 1 }],
      throughput: [],
      latency: [],
      analytics: {
        "deepseek/deepseek-v3.2": { requests: 100, total_tokens: 5000, tool_calls: 10 },
      },
      categories: [],
    };
    writeCache(TEST_FILE, rankings);
    const loaded = readCache<RankingsCache>(TEST_FILE);

    expect(loaded).not.toBeNull();
    expect(loaded!.popularity).toHaveLength(1);
    expect(loaded!.analytics["deepseek/deepseek-v3.2"].requests).toBe(100);
  });
});
