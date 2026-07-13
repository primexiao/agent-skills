import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("research-company uses adaptive perspectives as question generators", () => {
  const skill = read("skills/research-company/SKILL.md");

  assert.match(skill, /adaptive perspective map/i);
  assert.match(skill, /question generators/i);
  assert.match(skill, /falsifiable hypothesis/i);
  assert.match(skill, /preferred evidence/i);
});

test("research-company tracks contradictions and audits research coverage", () => {
  const skill = read("skills/research-company/SKILL.md");

  assert.match(skill, /contradiction ledger/i);
  assert.match(skill, /resolving question/i);
  assert.match(skill, /unrepresented stakeholder/i);
  assert.match(skill, /directly support/i);
});

test("invest reconciles investment narratives against independent signals", () => {
  const research = read("skills/invest/references/research.md");
  const earnings = read("skills/invest/references/earnings.md");
  const conflicts = read("skills/invest/references/narrative-conflicts.md");

  for (const content of [research, earnings]) {
    assert.match(content, /narrative-conflicts\.md/);
    assert.match(content, /投资叙事冲突表/);
  }
  assert.match(conflicts, /管理层叙事/);
  assert.match(conflicts, /客户\/渠道/);
  assert.match(conflicts, /竞争者表现/);
  assert.match(conflicts, /解决最大分歧/);
});

test("new research behavior has agent-level eval coverage", () => {
  const company = JSON.parse(read("evals/research-company/evals.json"));
  const invest = JSON.parse(read("evals/invest/evals.json"));

  assert.ok(company.evals.some(({ id }) => id === 4));
  assert.ok(company.evals.some(({ id }) => id === 5));
  assert.ok(invest.evals.some(({ id }) => id === 4));
});
