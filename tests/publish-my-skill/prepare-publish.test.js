import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(TEST_DIR, "../../skills/publish-my-skill/scripts/prepare-publish.js");

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "publish-my-skill-test-"));
  const repo = join(root, "repo");
  const source = join(root, "sample-skill");
  mkdirSync(join(repo, "skills"), { recursive: true });
  write(join(repo, "README.md"), [
    "# Agent Skills",
    "",
    "## Skills",
    "",
    "| Skill | Purpose | Install |",
    "| --- | --- | --- |",
    "| [`existing`](skills/existing/SKILL.md) | Existing skill. | `npx skills add primexiao/agent-skills --skill existing` |",
    "",
  ].join("\n"));
  write(join(source, "SKILL.md"), [
    "---",
    "name: sample-skill",
    "description: Prime's useful publisher. Use when testing publication.",
    "---",
    "",
    "# Sample Skill",
    "",
    "Read [the guide](references/guide.md).",
    "",
  ].join("\n"));
  write(join(source, "references/guide.md"), "# Guide\n");
  return { root, repo, source };
}

test("publishes a valid skill payload and adds its install row", () => {
  const { root, repo, source } = fixture();
  try {
    const output = execFileSync(process.execPath, [SCRIPT, source, "--repo", repo], {
      encoding: "utf8",
    });

    assert.equal(
      readFileSync(join(repo, "skills/sample-skill/SKILL.md"), "utf8"),
      readFileSync(join(source, "SKILL.md"), "utf8"),
    );
    assert.equal(readFileSync(join(repo, "skills/sample-skill/references/guide.md"), "utf8"), "# Guide\n");
    assert.match(
      readFileSync(join(repo, "README.md"), "utf8"),
      /\| \[`sample-skill`\]\(skills\/sample-skill\/SKILL\.md\) \| Prime's useful publisher\. \| `npx skills add primexiao\/agent-skills --skill sample-skill` \|/,
    );
    assert.equal(JSON.parse(output).name, "sample-skill");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("excludes regenerable runtime files from the published payload", () => {
  const { root, repo, source } = fixture();
  try {
    write(join(source, "cache/self-update-state.json"), "{}\n");
    write(join(source, "node_modules/example/index.js"), "throw new Error();\n");
    write(join(source, ".DS_Store"), "junk");
    write(join(source, "debug.log"), "junk\n");

    execFileSync(process.execPath, [SCRIPT, source, "--repo", repo]);

    const destination = join(repo, "skills/sample-skill");
    assert.equal(existsSync(join(destination, "cache")), false);
    assert.equal(existsSync(join(destination, "node_modules")), false);
    assert.equal(existsSync(join(destination, ".DS_Store")), false);
    assert.equal(existsSync(join(destination, "debug.log")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("leaves an existing published skill untouched when repository preflight fails", () => {
  const { root, repo, source } = fixture();
  try {
    write(join(repo, "README.md"), "# Missing skills table\n");
    write(join(repo, "skills/sample-skill/old.txt"), "keep me\n");

    const result = spawnSync(process.execPath, [SCRIPT, source, "--repo", repo], { encoding: "utf8" });

    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(join(repo, "skills/sample-skill/old.txt"), "utf8"), "keep me\n");
    assert.equal(existsSync(join(repo, "skills/sample-skill/SKILL.md")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
