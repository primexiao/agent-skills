import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateRepo } from "../../scripts/validate-repo.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

function fixtureRepo(t, { skillName = "demo", frontmatterName = skillName } = {}) {
  const root = mkdtempSync(join(tmpdir(), "agent-skills-validator-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const skillDir = join(root, "skills", skillName);
  mkdirSync(join(skillDir, "references"), { recursive: true });
  writeFileSync(
    join(skillDir, "SKILL.md"),
    `---\nname: ${frontmatterName}\ndescription: Use when validating a demo skill.\nmetadata:\n  version: "1.0.0"\n---\n\nRead \`references/guide.md\`.\n`,
  );
  writeFileSync(join(skillDir, "references", "guide.md"), "# Guide\n");
  writeFileSync(
    join(root, "README.md"),
    `# Skills\n\n| Skill | Purpose |\n| --- | --- |\n| [\`${skillName}\`](skills/${skillName}/SKILL.md) | Demo |\n`,
  );
  return root;
}

test("the current repository satisfies structural skill checks", () => {
  assert.deepEqual(validateRepo(ROOT), []);
});

test("the repository ships contributor, security, catalog, and CI policy", () => {
  for (const file of [
    "AGENTS.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "skills.sh.json",
    ".github/workflows/ci.yml",
  ]) {
    assert.ok(existsSync(join(ROOT, file)), `${file} is missing`);
  }
});

test("validator reports directory/name mismatches and missing local references", (t) => {
  const root = fixtureRepo(t, { frontmatterName: "other-name" });
  rmSync(join(root, "skills", "demo", "references", "guide.md"));

  const errors = validateRepo(root);

  assert.ok(errors.some((error) => error.includes("must match directory name")));
  assert.ok(errors.some((error) => error.includes("missing local resource")));
});

test("validator rejects stale or missing README catalog entries", (t) => {
  const root = fixtureRepo(t);
  writeFileSync(
    join(root, "README.md"),
    "# Skills\n\n[stale](skills/removed/SKILL.md)\n",
  );

  const errors = validateRepo(root);

  assert.ok(errors.some((error) => error.includes("README skill catalog mismatch")));
});

test("validator rejects duplicate and unknown skills.sh group entries", (t) => {
  const root = fixtureRepo(t);
  writeFileSync(
    join(root, "skills.sh.json"),
    JSON.stringify({
      $schema: "https://skills.sh/schemas/skills.sh.schema.json",
      notGrouped: "bottom",
      groupings: [{ title: "Demo", skills: ["demo", "demo", "ghost"] }],
    }),
  );

  const errors = validateRepo(root);

  assert.ok(errors.some((error) => error.includes("duplicate grouped skill demo")));
  assert.ok(errors.some((error) => error.includes("unknown grouped skill ghost")));
});
