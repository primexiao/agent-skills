import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const SCRIPT = fileURLToPath(
  new URL("../../skills/resolve-x-user-id/scripts/resolve_x_user_id.py", import.meta.url),
);

function runPython(source, ...args) {
  const result = spawnSync("python3", ["-c", source, SCRIPT, ...args], {
    encoding: "utf8",
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("resolver normalizes supported X account identifiers", () => {
  const output = runPython(
    `
import importlib.util
import json
import sys

spec = importlib.util.spec_from_file_location("resolve_x_user_id", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
print(json.dumps([module.normalize(value) for value in sys.argv[2:]]))
`,
    "@OpenAI",
    "44196397",
    "x.com/OpenAI",
    "https://twitter.com/i/user/44196397",
    "https://twitter.com/intent/user?user_id=44196397",
  );

  assert.deepEqual(JSON.parse(output), [
    ["username", "OpenAI"],
    ["id", "44196397"],
    ["username", "OpenAI"],
    ["id", "44196397"],
    ["id", "44196397"],
  ]);
});

test("resolver rejects malformed and non-X identifiers without network access", () => {
  const output = runPython(
    `
import importlib.util
import json
import sys

spec = importlib.util.spec_from_file_location("resolve_x_user_id", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
errors = []
for value in sys.argv[2:]:
    try:
        module.normalize(value)
    except ValueError as error:
        errors.append(str(error))
print(json.dumps(errors))
`,
    "https://example.com/OpenAI",
    "https://x.com/i/user/not-a-number",
    "not a username",
  );

  assert.equal(JSON.parse(output).length, 3);
});
