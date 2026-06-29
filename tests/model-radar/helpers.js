import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { sampleModels, sampleRankings } from "./fixtures.js";

export function tempDir(t, prefix = "model-radar-") {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

export function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function jsonResponse(body, options = {}) {
  const status = options.status ?? 200;

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: options.statusText ?? "OK",
    async json() {
      return body;
    },
  };
}

export function mockFetch(t, handler) {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  return calls;
}

export function seedModelRadarDir(t, overrides = {}) {
  const dir = tempDir(t);
  const cacheDir = join(dir, "cache");
  const configDir = join(dir, "config");
  const fetchedAt = new Date().toISOString();

  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(configDir, { recursive: true });

  writeJson(join(cacheDir, "models.json"), {
    metadata: {
      fetched_at: fetchedAt,
      ttl_hours: 6,
      count: overrides.models?.length ?? sampleModels().length,
    },
    models: overrides.models ?? sampleModels(),
  });

  writeJson(join(cacheDir, "rankings.json"), overrides.rankings ?? sampleRankings());

  writeJson(join(configDir, "presets.json"), overrides.presets ?? {});

  return dir;
}
