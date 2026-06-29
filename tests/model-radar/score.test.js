import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalize, scoreModels } from "../../skills/model-radar/scripts/score.js";
import { sampleModels } from "./fixtures.js";

const CODING_PRESET = {
  weights: { cost: 0.25, context: 0.2, output: 0.25, capability: 0.3 },
  required_capabilities: ["tool_use", "reasoning", "long_output"],
};

const COST_ONLY_PRESET = {
  weights: { cost: 1, context: 0, output: 0, capability: 0 },
  required_capabilities: [],
};

describe("score", () => {
  it("normalizes bounded values", () => {
    assert.equal(normalize(5, 0, 10), 0.5);
    assert.equal(normalize(0, 0, 10), 0);
    assert.equal(normalize(10, 0, 10), 1);
    assert.equal(normalize(5, 5, 5), 0);
  });

  it("sorts by total score by default", () => {
    const result = scoreModels(sampleModels(), CODING_PRESET);

    assert.equal(result[0].model.id, "anthropic/claude-sonnet-4");
    assert.ok(result[0].score > result.at(-1).score);
  });

  it("scores cost-only presets using inverse blended price", () => {
    const result = scoreModels(sampleModels(), COST_ONLY_PRESET);

    assert.equal(result[0].model.id, "meta-llama/llama-3.3-70b-instruct");
    assert.equal(result.at(-1).model.id, "anthropic/claude-sonnet-4");
  });
});
