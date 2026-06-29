import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { seedModelRadarDir } from "./helpers.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CLI_PATH = join(REPO_ROOT, "skills/model-radar/scripts/main.js");

function runCli(t, args) {
  const skillDir = seedModelRadarDir(t);
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      MODEL_RADAR_DIR: skillDir,
    },
    encoding: "utf8",
  });
}

describe("model-radar cli smoke", () => {
  it("lists image generation models from seeded cache", (t) => {
    const result = runCli(t, ["list", "gen:image", "sort:popular", "top:2"]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /google\/gemini-2\.5-flash-image-preview/);
    assert.match(result.stdout, /"popularity_rank": 1/);
  });

  it("compares models from seeded cache", (t) => {
    const result = runCli(t, [
      "compare",
      "gpt-4o-mini",
      "gemini-2.5-flash-image-preview",
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /GPT-4o mini/);
    assert.match(result.stdout, /Gemini 2\.5 Flash Image Preview/);
  });
});
