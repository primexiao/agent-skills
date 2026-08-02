import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SKILL = new URL("../../skills/add-icp-footer/SKILL.md", import.meta.url);

test("ICP skill refreshes official rules before choosing edit or snippet mode", () => {
  const source = readFileSync(SKILL, "utf8");

  assert.match(source, /help\.aliyun\.com\/zh\/icp-filing\/basic-icp-service\/the-icp-record-post-processing-1/);
  assert.match(source, /first|required.*official|must.*official/i);
  assert.match(source, /current working directory|cwd/i);
  assert.match(source, /modify.*source|edit.*source/i);
  assert.match(source, /code snippet/i);
});

test("ICP skill preserves the supplied number and uses a visible fallback placeholder", () => {
  const source = readFileSync(SKILL, "utf8");

  assert.match(source, /https:\/\/beian\.miit\.gov\.cn\//);
  assert.match(source, /use.*exactly|verbatim/i);
  assert.match(source, /YOUR_ICP_NUMBER/);
  assert.doesNotMatch(source, /YOUR_ICP_FILING_NUMBER/);
  assert.match(source, /replace.*placeholder/i);
  assert.match(source, /例如：浙ICP备123456号-1/);
});
