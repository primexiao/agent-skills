import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { join } from "node:path";

import { isCacheValid, readCache, writeCache } from "../../skills/model-radar/scripts/cache.js";
import { readJson, tempDir } from "./helpers.js";

describe("cache", () => {
  it("writes and reads JSON cache files", (t) => {
    const dir = tempDir(t);
    const filePath = join(dir, "models.json");
    const payload = {
      metadata: { fetched_at: new Date().toISOString(), ttl_hours: 6, count: 1 },
      models: [{ id: "openai/gpt-4o-mini" }],
    };

    writeCache(filePath, payload);

    assert.deepEqual(readCache(filePath), payload);
    assert.deepEqual(readJson(filePath), payload);
  });

  it("treats missing, stale, and invalid caches as invalid", (t) => {
    const dir = tempDir(t);
    const missingPath = join(dir, "missing.json");
    const stalePath = join(dir, "stale.json");
    const invalidPath = join(dir, "invalid.json");

    writeCache(stalePath, {
      metadata: { fetched_at: "2020-01-01T00:00:00.000Z", ttl_hours: 6 },
      models: [],
    });
    writeCache(invalidPath, { metadata: {}, models: [] });

    assert.equal(readCache(missingPath), null);
    assert.equal(isCacheValid(readCache(stalePath)), false);
    assert.equal(readCache(invalidPath), null);
  });

  it("accepts fresh caches within the ttl", (t) => {
    const dir = tempDir(t);
    const filePath = join(dir, "fresh.json");

    writeCache(filePath, {
      metadata: { fetched_at: new Date().toISOString(), ttl_hours: 6 },
      models: [],
    });

    assert.equal(isCacheValid(readCache(filePath)), true);
  });
});
