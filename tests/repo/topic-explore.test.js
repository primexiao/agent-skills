import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function url(relativePath) {
  return new URL(`../../${relativePath}`, import.meta.url);
}

function read(relativePath) {
  return readFileSync(url(relativePath), "utf8");
}

test("topic routes explore explicitly and preserves the default branch", () => {
  const skill = read("skills/topic/SKILL.md");

  assert.match(skill, /`explore \[seed\]`/);
  assert.match(skill, /references\/explore\.md/);
  assert.match(skill, /default mode does not force divergence/i);
  assert.match(skill, /\(bare \/ anything else\).*new-topic\.md/);
});

test("topic explore uses adaptive perspectives and evidence only when needed", () => {
  const explorePath = "skills/topic/references/explore.md";
  assert.ok(existsSync(url(explorePath)), `${explorePath} is missing`);
  const explore = read(explorePath);

  assert.match(explore, /adaptive perspectives/i);
  assert.match(explore, /no fixed roles/i);
  assert.match(explore, /questions, hypotheses, or counterexamples/i);
  assert.match(explore, /research only when/i);
  assert.match(explore, /not evidence/i);
});

test("topic explore converges and persists through the existing close behavior", () => {
  const explorePath = "skills/topic/references/explore.md";
  assert.ok(existsSync(url(explorePath)), `${explorePath} is missing`);
  const explore = read(explorePath);

  assert.match(explore, /decide/i);
  assert.match(explore, /close/i);
  assert.match(explore, /README\.md/);
  assert.match(explore, /Session Close/);
});

test("topic explore and unchanged default behavior have agent-level evals", () => {
  const corpus = JSON.parse(read("evals/topic/evals.json"));

  assert.ok(corpus.evals.some(({ id }) => id === 4));
  assert.ok(corpus.evals.some(({ id }) => id === 5));
});
