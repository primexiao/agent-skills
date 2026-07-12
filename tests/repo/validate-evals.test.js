import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateEvals } from "../../scripts/validate-evals.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

test("every published skill has valid behavior and routing evals", () => {
  assert.deepEqual(validateEvals(ROOT), []);
});

test("eval validator rejects duplicate ids and one-sided routing sets", (t) => {
  const root = mkdtempSync(join(tmpdir(), "agent-skills-evals-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "skills", "demo"), { recursive: true });
  mkdirSync(join(root, "evals", "demo"), { recursive: true });
  mkdirSync(join(root, "evals", "routing"), { recursive: true });
  writeFileSync(join(root, "skills", "demo", "SKILL.md"), "---\nname: demo\ndescription: demo\n---\n");
  writeFileSync(
    join(root, "evals", "demo", "evals.json"),
    JSON.stringify({
      skill_name: "demo",
      evals: [
        { id: 1, prompt: "a", expected_output: "a", expectations: ["a"] },
        { id: 1, prompt: "b", expected_output: "b", expectations: ["b"] },
      ],
    }),
  );
  writeFileSync(
    join(root, "evals", "routing", "demo.json"),
    JSON.stringify([{ query: "use demo", should_trigger: true }]),
  );

  const errors = validateEvals(root);

  assert.ok(errors.some((error) => error.includes("duplicate eval id")));
  assert.ok(errors.some((error) => error.includes("positive and negative")));
});
