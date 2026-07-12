import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { filterModels, matchesRange } from "../../skills/model-radar/scripts/filter.js";
import { sampleModels } from "./fixtures.js";

describe("filter", () => {
  it("matches numeric ranges with inclusive min and max", () => {
    assert.equal(matchesRange(10, { min: 5, max: 10 }), true);
    assert.equal(matchesRange(4, { min: 5 }), false);
    assert.equal(matchesRange(11, { max: 10 }), false);
    assert.equal(matchesRange(Number.NaN, { max: 10 }), false);
    assert.equal(matchesRange(null, { min: 1 }), false);
  });

  it("filters by modality and capability tokens", () => {
    const result = filterModels(sampleModels(), {
      output_modalities: ["image"],
      capabilities: ["vision"],
    });

    assert.deepEqual(
      result.map((model) => model.id),
      ["google/gemini-2.5-flash-image-preview"],
    );
  });

  it("filters by Hugging Face listing and pricing range", () => {
    const result = filterModels(sampleModels(), {
      hugging_face_listed: true,
      price: { max: 1 },
    });

    assert.deepEqual(
      result.map((model) => model.id),
      ["meta-llama/llama-3.3-70b-instruct"],
    );
  });

  it("filters by context range", () => {
    const result = filterModels(sampleModels(), {
      context: { min: 180000 },
    });

    assert.deepEqual(
      result.map((model) => model.id),
      ["anthropic/claude-sonnet-4"],
    );
  });
});
