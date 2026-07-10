import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(TEST_DIR, "../../skills/publish-my-skill/scripts/self-update.js");

test("self-update recognizes the canonical source checkout", () => {
  const output = execFileSync(process.execPath, [SCRIPT, "status"], { encoding: "utf8" });
  const status = JSON.parse(output);

  assert.equal(status.repository, "https://github.com/primexiao/agent-skills.git");
  assert.equal(status.directory, "skills/publish-my-skill");
  assert.equal(status.local_version, "1.0.0");
  assert.equal(status.source_checkout, true);
});
