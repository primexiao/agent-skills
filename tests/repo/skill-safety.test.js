import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

function skill(name) {
  return readFileSync(join(ROOT, "skills", name, "SKILL.md"), "utf8");
}

function file(...parts) {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

test("web-research skills define an untrusted-content boundary", () => {
  for (const name of ["research-company", "invest"]) {
    const source = skill(name);
    assert.match(source, /untrusted|不可信/i, `${name} must label external content untrusted`);
    assert.match(source, /ignore|忽略/i, `${name} must instruct agents to ignore embedded instructions`);
    assert.match(source, /execute|执行/i, `${name} must forbid source-directed execution`);
  }
});

test("investment reports are not persisted unless the user asks", () => {
  const source = skill("invest");
  assert.match(source, /only.*(?:save|persist)|仅.*(?:保存|落盘)/i);

  const references = ["checklist", "earnings", "macro", "portfolio", "research"]
    .map((name) => file("skills", "invest", "references", `${name}.md`))
    .join("\n");
  assert.doesNotMatch(references, /^(?:\d+\.\s*)?(?:报告)?写入/m);
});

test("Benford output is framed as screening, not fraud detection", () => {
  const source = file("skills", "invest", "tools", "financial_rigor.py");
  assert.doesNotMatch(source, /造假检测|Fabrication Check/i);
});

test("topic audits preserve read-only intent and redact discovered secrets", () => {
  const source = skill("topic");
  const init = file("skills", "topic", "references", "init.md");

  assert.match(source, /check-only|read-only/i);
  assert.match(source, /untrusted/i);
  assert.match(source, /ignore.*embedded instructions/i);
  assert.match(init, /redact|never print.*secret/i);
  assert.match(init, /filenames? only|paths? and secret types? only/i);
  assert.match(init, /never print matching lines/i);
  assert.match(init, /same trust boundary/i);
  assert.match(init, /without.*subagent|sequential/i);
});
