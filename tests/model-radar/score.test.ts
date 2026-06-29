import { describe, expect, it } from "bun:test";
import { normalize, scoreModels } from "../../skills/model-radar/scripts/score";
import type { EnrichedModel, Preset } from "../../skills/model-radar/scripts/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModel(overrides: Partial<EnrichedModel> = {}): EnrichedModel {
  return {
    id: "test/model-1",
    name: "Test Model 1",
    description: "",
    created: 1700000000,
    context_length: 128_000,
    max_completion_tokens: 4096,
    modality: "text",
    input_modalities: ["text"],
    output_modalities: ["text"],
    is_moderated: false,
    is_open_source: false,
    pricing: {
      prompt_per_mtok: 3,
      completion_per_mtok: 15,
      blended_per_mtok: 9,
      cache_read_per_mtok: null,
      cache_write_per_mtok: null,
      web_search_per_request: null,
    },
    capabilities: ["tool_use", "reasoning"],
    supported_parameters: [],
    ...overrides,
  };
}

function makePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    name: "test",
    description: "test preset",
    weights: { cost: 0.25, context: 0.25, output: 0.25, capability: 0.25 },
    required_capabilities: [],
    prompt_completion_ratio: [3, 1],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalize()
// ---------------------------------------------------------------------------

describe("normalize", () => {
  it("returns 0 for min value", () => {
    expect(normalize(0, 0, 100)).toBe(0);
  });

  it("returns 1 for max value", () => {
    expect(normalize(100, 0, 100)).toBe(1);
  });

  it("returns 0.5 for midpoint", () => {
    expect(normalize(50, 0, 100)).toBe(0.5);
  });

  it("returns 0 when min equals max (avoid division by zero)", () => {
    expect(normalize(5, 5, 5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scoreModels()
// ---------------------------------------------------------------------------

describe("scoreModels", () => {
  it("returns empty array for empty input", () => {
    const result = scoreModels([], makePreset());
    expect(result).toEqual([]);
  });

  it("ranks cheaper model higher when cost weight is dominant", () => {
    const cheap = makeModel({
      id: "cheap",
      pricing: {
        prompt_per_mtok: 0.5,
        completion_per_mtok: 1,
        blended_per_mtok: 0.75,
        cache_read_per_mtok: null,
        cache_write_per_mtok: null,
        web_search_per_request: null,
      },
    });
    const expensive = makeModel({
      id: "expensive",
      pricing: {
        prompt_per_mtok: 50,
        completion_per_mtok: 100,
        blended_per_mtok: 75,
        cache_read_per_mtok: null,
        cache_write_per_mtok: null,
        web_search_per_request: null,
      },
    });

    const preset = makePreset({
      weights: { cost: 0.9, context: 0.03, output: 0.03, capability: 0.04 },
    });

    const result = scoreModels([expensive, cheap], preset);
    expect(result[0].model.id).toBe("cheap");
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it("ranks larger context model higher when context weight is dominant", () => {
    const bigCtx = makeModel({ id: "big-ctx", context_length: 1_000_000 });
    const smallCtx = makeModel({ id: "small-ctx", context_length: 4_096 });

    const preset = makePreset({
      weights: { cost: 0.03, context: 0.9, output: 0.03, capability: 0.04 },
    });

    const result = scoreModels([smallCtx, bigCtx], preset);
    expect(result[0].model.id).toBe("big-ctx");
  });

  it("capability score is ratio of matched to required capabilities", () => {
    const fullCap = makeModel({
      id: "full",
      capabilities: ["tool_use", "reasoning", "vision"],
    });
    const halfCap = makeModel({
      id: "half",
      capabilities: ["tool_use"],
    });

    const preset = makePreset({
      weights: { cost: 0, context: 0, output: 0, capability: 1.0 },
      required_capabilities: ["tool_use", "reasoning"],
    });

    const result = scoreModels([halfCap, fullCap], preset);
    // full has 2/2 = 1.0, half has 1/2 = 0.5
    expect(result[0].model.id).toBe("full");
    expect(result[0].score_breakdown.capability).toBe(1.0);
    expect(result[1].score_breakdown.capability).toBe(0.5);
  });

  it("handles models with null max_completion_tokens (output score = 0)", () => {
    const withOutput = makeModel({
      id: "with-output",
      max_completion_tokens: 16_384,
    });
    const nullOutput = makeModel({
      id: "null-output",
      max_completion_tokens: null,
    });

    const preset = makePreset({
      weights: { cost: 0, context: 0, output: 1.0, capability: 0 },
    });

    const result = scoreModels([nullOutput, withOutput], preset);
    expect(result[0].model.id).toBe("with-output");
    // null output → 0 raw value → normalized to 0 (min)
    expect(result[1].score_breakdown.output).toBe(0);
  });

  it("handles free models (price = 0) without division errors", () => {
    const free = makeModel({
      id: "free",
      pricing: {
        prompt_per_mtok: 0,
        completion_per_mtok: 0,
        blended_per_mtok: 0,
        cache_read_per_mtok: null,
        cache_write_per_mtok: null,
        web_search_per_request: null,
      },
    });
    const paid = makeModel({
      id: "paid",
      pricing: {
        prompt_per_mtok: 10,
        completion_per_mtok: 30,
        blended_per_mtok: 20,
        cache_read_per_mtok: null,
        cache_write_per_mtok: null,
        web_search_per_request: null,
      },
    });

    const preset = makePreset({
      weights: { cost: 1.0, context: 0, output: 0, capability: 0 },
    });

    const result = scoreModels([paid, free], preset);
    // free model should rank first (highest inverse price)
    expect(result[0].model.id).toBe("free");
    // no NaN or Infinity in scores
    expect(Number.isFinite(result[0].score)).toBe(true);
    expect(Number.isFinite(result[1].score)).toBe(true);
  });
});
