import { describe, expect, it } from "bun:test";
import { calculatePricing, extractCapabilities, enrichModel } from "../../skills/model-radar/scripts/enrich";
import type { OpenRouterRawModel } from "../../skills/model-radar/scripts/types";

// --- helpers ---

function makeRawModel(overrides: Partial<OpenRouterRawModel> = {}): OpenRouterRawModel {
  return {
    id: "test/model-1",
    name: "Test Model",
    description: "A test model",
    created: 1700000000,
    context_length: 128000,
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
      tokenizer: "cl100k_base",
      instruct_type: "none",
    },
    pricing: {
      prompt: "0.000003",
      completion: "0.000015",
    },
    top_provider: {
      context_length: 128000,
      max_completion_tokens: 4096,
      is_moderated: false,
    },
    supported_parameters: ["temperature", "top_p"],
    hugging_face_id: null,
    per_request_limits: null,
    default_parameters: {},
    knowledge_cutoff: null,
    expiration_date: null,
    links: {},
    ...overrides,
  };
}

// ============================================================
// calculatePricing
// ============================================================

describe("calculatePricing", () => {
  it("converts per-token string prices to per-million-token numbers", () => {
    const result = calculatePricing({
      prompt: "0.000003",
      completion: "0.000015",
    });

    expect(result.prompt_per_mtok).toBeCloseTo(3, 6);
    expect(result.completion_per_mtok).toBeCloseTo(15, 6);
  });

  it("calculates blended price with default weights (0.4 prompt + 0.6 completion)", () => {
    const result = calculatePricing({
      prompt: "0.000003",
      completion: "0.000015",
    });

    // blended = 3 * 0.4 + 15 * 0.6 = 1.2 + 9.0 = 10.2
    expect(result.blended_per_mtok).toBeCloseTo(10.2, 6);
  });

  it("accepts custom prompt/completion weights", () => {
    const result = calculatePricing(
      { prompt: "0.000003", completion: "0.000015" },
      0.7,
      0.3,
    );

    // blended = 3 * 0.7 + 15 * 0.3 = 2.1 + 4.5 = 6.6
    expect(result.blended_per_mtok).toBeCloseTo(6.6, 6);
  });

  it("handles cache pricing", () => {
    const result = calculatePricing({
      prompt: "0.000003",
      completion: "0.000015",
      input_cache_read: "0.0000015",
      input_cache_write: "0.00000375",
    });

    expect(result.cache_read_per_mtok).toBeCloseTo(1.5, 6);
    expect(result.cache_write_per_mtok).toBeCloseTo(3.75, 6);
  });

  it("handles web_search pricing", () => {
    const result = calculatePricing({
      prompt: "0.000003",
      completion: "0.000015",
      web_search: "0.005",
    });

    // web_search is per-request, not per-token — stored as parseFloat directly
    expect(result.web_search_per_request).toBeCloseTo(0.005, 6);
  });

  it("returns null for missing optional pricing fields", () => {
    const result = calculatePricing({
      prompt: "0.000003",
      completion: "0.000015",
    });

    expect(result.cache_read_per_mtok).toBeNull();
    expect(result.cache_write_per_mtok).toBeNull();
    expect(result.web_search_per_request).toBeNull();
  });

  it("handles free models (price = '0')", () => {
    const result = calculatePricing({
      prompt: "0",
      completion: "0",
    });

    expect(result.prompt_per_mtok).toBe(0);
    expect(result.completion_per_mtok).toBe(0);
    expect(result.blended_per_mtok).toBe(0);
  });
});

// ============================================================
// extractCapabilities
// ============================================================

describe("extractCapabilities", () => {
  it("detects tool_use when BOTH tools AND tool_choice in supported_parameters", () => {
    const caps = extractCapabilities(
      ["tools", "tool_choice", "temperature"],
      ["text"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).toContain("tool_use");
  });

  it("does NOT flag tool_use if only tools without tool_choice", () => {
    const caps = extractCapabilities(
      ["tools", "temperature"],
      ["text"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).not.toContain("tool_use");
  });

  it("does NOT flag tool_use if only tool_choice without tools", () => {
    const caps = extractCapabilities(
      ["tool_choice", "temperature"],
      ["text"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).not.toContain("tool_use");
  });

  it("detects reasoning from 'reasoning' in supported_parameters", () => {
    const caps = extractCapabilities(
      ["reasoning"],
      ["text"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).toContain("reasoning");
  });

  it("detects reasoning from 'include_reasoning' in supported_parameters", () => {
    const caps = extractCapabilities(
      ["include_reasoning"],
      ["text"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).toContain("reasoning");
  });

  it("detects structured_output from 'structured_outputs' in supported_parameters", () => {
    const caps = extractCapabilities(
      ["structured_outputs"],
      ["text"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).toContain("structured_output");
  });

  it("detects structured_output from 'response_format' in supported_parameters", () => {
    const caps = extractCapabilities(
      ["response_format"],
      ["text"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).toContain("structured_output");
  });

  it("detects vision from input_modalities containing 'image'", () => {
    const caps = extractCapabilities(
      [],
      ["text", "image"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).toContain("vision");
  });

  it("does NOT detect vision without image in input_modalities", () => {
    const caps = extractCapabilities(
      [],
      ["text"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).not.toContain("vision");
  });

  it("detects long_output when max_completion_tokens >= 32000", () => {
    const caps = extractCapabilities(
      [],
      ["text"],
      ["text"],
      32000,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).toContain("long_output");
  });

  it("does NOT detect long_output when max_completion_tokens < 32000", () => {
    const caps = extractCapabilities(
      [],
      ["text"],
      ["text"],
      31999,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).not.toContain("long_output");
  });

  it("does NOT detect long_output when max_completion_tokens is null", () => {
    const caps = extractCapabilities(
      [],
      ["text"],
      ["text"],
      null,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).not.toContain("long_output");
  });

  it("detects prompt_caching from cache pricing > 0", () => {
    const caps = extractCapabilities(
      [],
      ["text"],
      ["text"],
      4096,
      {
        prompt: "0.000003",
        completion: "0.000015",
        input_cache_read: "0.0000015",
      },
    );

    expect(caps).toContain("prompt_caching");
  });

  it("does NOT detect prompt_caching when cache pricing is 0", () => {
    const caps = extractCapabilities(
      [],
      ["text"],
      ["text"],
      4096,
      {
        prompt: "0.000003",
        completion: "0.000015",
        input_cache_read: "0",
      },
    );

    expect(caps).not.toContain("prompt_caching");
  });

  it("does NOT detect prompt_caching when no cache pricing", () => {
    const caps = extractCapabilities(
      [],
      ["text"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );

    expect(caps).not.toContain("prompt_caching");
  });

  it("detects web_search from web_search pricing > 0", () => {
    const caps = extractCapabilities(
      [],
      ["text"],
      ["text"],
      4096,
      {
        prompt: "0.000003",
        completion: "0.000015",
        web_search: "0.005",
      },
    );

    expect(caps).toContain("web_search");
  });

  it("does NOT detect web_search when web_search pricing is 0", () => {
    const caps = extractCapabilities(
      [],
      ["text"],
      ["text"],
      4096,
      {
        prompt: "0.000003",
        completion: "0.000015",
        web_search: "0",
      },
    );

    expect(caps).not.toContain("web_search");
  });

  it("detects audio_input from input_modalities containing 'audio'", () => {
    const caps = extractCapabilities(
      [],
      ["text", "audio"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );
    expect(caps).toContain("audio_input");
  });

  it("does NOT detect audio_input without audio in input_modalities", () => {
    const caps = extractCapabilities(
      [],
      ["text", "image"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );
    expect(caps).not.toContain("audio_input");
  });

  it("detects video_input from input_modalities containing 'video'", () => {
    const caps = extractCapabilities(
      [],
      ["text", "video"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );
    expect(caps).toContain("video_input");
  });

  it("detects file_input from input_modalities containing 'file'", () => {
    const caps = extractCapabilities(
      [],
      ["text", "file"],
      ["text"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );
    expect(caps).toContain("file_input");
  });

  it("detects image_generation from output_modalities containing 'image'", () => {
    const caps = extractCapabilities(
      [],
      ["text"],
      ["text", "image"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );
    expect(caps).toContain("image_generation");
  });

  it("detects audio_output from output_modalities containing 'audio'", () => {
    const caps = extractCapabilities(
      [],
      ["text"],
      ["text", "audio"],
      4096,
      { prompt: "0.000003", completion: "0.000015" },
    );
    expect(caps).toContain("audio_output");
  });
});

// ============================================================
// enrichModel
// ============================================================

describe("enrichModel", () => {
  it("converts raw model to enriched model with correct fields", () => {
    const raw = makeRawModel();
    const enriched = enrichModel(raw);

    expect(enriched.id).toBe("test/model-1");
    expect(enriched.name).toBe("Test Model");
    expect(enriched.description).toBe("A test model");
    expect(enriched.created).toBe(1700000000);
    expect(enriched.context_length).toBe(128000);
    expect(enriched.max_completion_tokens).toBe(4096);
    expect(enriched.modality).toBe("text->text");
    expect(enriched.input_modalities).toEqual(["text"]);
    expect(enriched.output_modalities).toEqual(["text"]);
    expect(enriched.is_moderated).toBe(false);
    expect(enriched.is_open_source).toBe(false);
    expect(enriched.supported_parameters).toEqual(["temperature", "top_p"]);

    // pricing should be populated
    expect(enriched.pricing.prompt_per_mtok).toBeCloseTo(3, 6);
    expect(enriched.pricing.completion_per_mtok).toBeCloseTo(15, 6);

    // capabilities should be an array
    expect(Array.isArray(enriched.capabilities)).toBe(true);
  });

  it("marks model as open source when hugging_face_id is present", () => {
    const raw = makeRawModel({ hugging_face_id: "meta-llama/Llama-3-70b" });
    const enriched = enrichModel(raw);

    expect(enriched.is_open_source).toBe(true);
  });

  it("marks model as NOT open source when hugging_face_id is null", () => {
    const raw = makeRawModel({ hugging_face_id: null });
    const enriched = enrichModel(raw);

    expect(enriched.is_open_source).toBe(false);
  });

  it("handles null max_completion_tokens", () => {
    const raw = makeRawModel({
      top_provider: {
        context_length: 128000,
        max_completion_tokens: null,
        is_moderated: false,
      },
    });
    const enriched = enrichModel(raw);

    expect(enriched.max_completion_tokens).toBeNull();
  });

  it("passes supported_parameters and pricing through to capability extraction", () => {
    const raw = makeRawModel({
      supported_parameters: ["tools", "tool_choice", "reasoning", "response_format"],
      architecture: {
        modality: "text->text",
        input_modalities: ["text", "image"],
        output_modalities: ["text", "image"],
        tokenizer: "cl100k_base",
        instruct_type: "none",
      },
      top_provider: {
        context_length: 128000,
        max_completion_tokens: 65536,
        is_moderated: false,
      },
      pricing: {
        prompt: "0.000003",
        completion: "0.000015",
        input_cache_read: "0.0000015",
        web_search: "0.005",
      },
    });
    const enriched = enrichModel(raw);

    expect(enriched.capabilities).toContain("tool_use");
    expect(enriched.capabilities).toContain("reasoning");
    expect(enriched.capabilities).toContain("structured_output");
    expect(enriched.capabilities).toContain("vision");
    expect(enriched.capabilities).toContain("long_output");
    expect(enriched.capabilities).toContain("prompt_caching");
    expect(enriched.capabilities).toContain("web_search");
    expect(enriched.capabilities).toContain("image_generation");
    expect(enriched.input_modalities).toEqual(["text", "image"]);
    expect(enriched.output_modalities).toEqual(["text", "image"]);
  });
});
