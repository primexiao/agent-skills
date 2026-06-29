import { describe, expect, it } from "bun:test";
import { filterModels, matchesRange } from "../../skills/model-radar/scripts/filter";
import type { EnrichedModel, FilterConstraints, RangeValue } from "../../skills/model-radar/scripts/types";

function makeModel(overrides: Partial<EnrichedModel> = {}): EnrichedModel {
  return {
    id: "test/model",
    name: "Test Model",
    description: "A test model",
    created: 1700000000,
    context_length: 128_000,
    max_completion_tokens: 4096,
    modality: "text->text",
    input_modalities: ["text"],
    output_modalities: ["text"],
    is_moderated: false,
    is_open_source: false,
    pricing: {
      prompt_per_mtok: 3,
      completion_per_mtok: 15,
      blended_per_mtok: 7,
      cache_read_per_mtok: null,
      cache_write_per_mtok: null,
      web_search_per_request: null,
    },
    capabilities: ["tool_use", "structured_output"],
    supported_parameters: ["temperature", "top_p"],
    ...overrides,
  };
}

describe("matchesRange", () => {
  it("matches when value is within min..max", () => {
    expect(matchesRange(5, { min: 1, max: 10 })).toBe(true);
  });

  it("matches at exact min boundary", () => {
    expect(matchesRange(1, { min: 1, max: 10 })).toBe(true);
  });

  it("matches at exact max boundary", () => {
    expect(matchesRange(10, { min: 1, max: 10 })).toBe(true);
  });

  it("rejects below min", () => {
    expect(matchesRange(0, { min: 1, max: 10 })).toBe(false);
  });

  it("rejects above max", () => {
    expect(matchesRange(11, { min: 1, max: 10 })).toBe(false);
  });

  it("handles max-only (..10)", () => {
    expect(matchesRange(5, { max: 10 })).toBe(true);
    expect(matchesRange(15, { max: 10 })).toBe(false);
  });

  it("handles min-only (5..)", () => {
    expect(matchesRange(10, { min: 5 })).toBe(true);
    expect(matchesRange(3, { min: 5 })).toBe(false);
  });

  it("matches anything with empty range", () => {
    expect(matchesRange(999, {})).toBe(true);
  });
});

describe("filterModels", () => {
  const models: EnrichedModel[] = [
    makeModel({
      id: "cheap/small",
      pricing: { ...makeModel().pricing, blended_per_mtok: 1 },
      context_length: 32_000,
      max_completion_tokens: 2048,
      capabilities: ["tool_use"],
      input_modalities: ["text"],
      output_modalities: ["text"],
      is_open_source: true,
    }),
    makeModel({
      id: "mid/medium",
      pricing: { ...makeModel().pricing, blended_per_mtok: 5 },
      context_length: 128_000,
      max_completion_tokens: 8192,
      capabilities: ["tool_use", "reasoning", "vision"],
      input_modalities: ["text", "image"],
      output_modalities: ["text"],
      is_open_source: false,
    }),
    makeModel({
      id: "expensive/large",
      pricing: { ...makeModel().pricing, blended_per_mtok: 20 },
      context_length: 200_000,
      max_completion_tokens: 32768,
      capabilities: ["tool_use", "reasoning", "structured_output", "vision", "long_output"],
      input_modalities: ["text", "image", "audio"],
      output_modalities: ["text"],
      is_open_source: false,
    }),
    makeModel({
      id: "vision/gen",
      pricing: { ...makeModel().pricing, blended_per_mtok: 8 },
      modality: "text+image->text+image",
      context_length: 64_000,
      max_completion_tokens: null,
      capabilities: ["vision", "image_generation"],
      input_modalities: ["text", "image"],
      output_modalities: ["text", "image"],
      is_open_source: true,
    }),
  ];

  it("returns all models with empty constraints", () => {
    const result = filterModels(models, {});
    expect(result).toHaveLength(models.length);
  });

  // --- price range ---
  it("filters by price max", () => {
    const result = filterModels(models, { price: { max: 5 } });
    expect(result.map((m) => m.id)).toEqual(["cheap/small", "mid/medium"]);
  });

  it("filters by price min", () => {
    const result = filterModels(models, { price: { min: 8 } });
    expect(result.map((m) => m.id)).toEqual(["expensive/large", "vision/gen"]);
  });

  it("filters by price range", () => {
    const result = filterModels(models, { price: { min: 2, max: 10 } });
    expect(result.map((m) => m.id)).toEqual(["mid/medium", "vision/gen"]);
  });

  // --- context range ---
  it("filters by context min", () => {
    const result = filterModels(models, { context: { min: 100_000 } });
    expect(result.map((m) => m.id)).toEqual(["mid/medium", "expensive/large"]);
  });

  it("filters by context max", () => {
    const result = filterModels(models, { context: { max: 64_000 } });
    expect(result.map((m) => m.id)).toEqual(["cheap/small", "vision/gen"]);
  });

  // --- output range ---
  it("filters by output min", () => {
    const result = filterModels(models, { output: { min: 8192 } });
    expect(result.map((m) => m.id)).toEqual(["mid/medium", "expensive/large"]);
  });

  it("output filter rejects models with null max_completion_tokens", () => {
    const result = filterModels(models, { output: { min: 1 } });
    expect(result.map((m) => m.id)).toEqual(["cheap/small", "mid/medium", "expensive/large"]);
  });

  // --- capabilities (AND) ---
  it("filters by single capability", () => {
    const result = filterModels(models, { capabilities: ["vision"] });
    expect(result.map((m) => m.id)).toEqual(["mid/medium", "expensive/large", "vision/gen"]);
  });

  it("filters by multiple capabilities (AND)", () => {
    const result = filterModels(models, { capabilities: ["reasoning", "vision"] });
    expect(result.map((m) => m.id)).toEqual(["mid/medium", "expensive/large"]);
  });

  // --- input modalities ---
  it("filters by input modality", () => {
    const result = filterModels(models, { input_modalities: ["image"] });
    expect(result.map((m) => m.id)).toEqual(["mid/medium", "expensive/large", "vision/gen"]);
  });

  it("filters by multiple input modalities (AND)", () => {
    const result = filterModels(models, { input_modalities: ["image", "audio"] });
    expect(result.map((m) => m.id)).toEqual(["expensive/large"]);
  });

  // --- output modalities ---
  it("filters by output modality", () => {
    const result = filterModels(models, { output_modalities: ["image"] });
    expect(result.map((m) => m.id)).toEqual(["vision/gen"]);
  });

  // --- open source ---
  it("filters by open_source true", () => {
    const result = filterModels(models, { open_source: true });
    expect(result.map((m) => m.id)).toEqual(["cheap/small", "vision/gen"]);
  });

  it("filters by open_source false", () => {
    const result = filterModels(models, { open_source: false });
    expect(result.map((m) => m.id)).toEqual(["mid/medium", "expensive/large"]);
  });

  // --- combined ---
  it("combines price + capability + input modality", () => {
    const result = filterModels(models, {
      price: { max: 10 },
      capabilities: ["tool_use"],
      input_modalities: ["image"],
    });
    expect(result.map((m) => m.id)).toEqual(["mid/medium"]);
  });

  it("combined constraints can return empty", () => {
    const result = filterModels(models, {
      price: { max: 1 },
      capabilities: ["reasoning", "vision"],
    });
    expect(result).toHaveLength(0);
  });
});
