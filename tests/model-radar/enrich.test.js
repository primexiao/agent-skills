import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculatePricing,
  enrichModel,
  extractCapabilities,
} from "../../skills/model-radar/scripts/enrich.js";
import { rawModel } from "./fixtures.js";

describe("enrich", () => {
  it("converts token prices to dollars per million tokens", () => {
    const pricing = calculatePricing({
      prompt: "0.0000003",
      completion: "0.0000025",
    });

    assert.equal(pricing.prompt_per_mtok, 0.3);
    assert.equal(pricing.completion_per_mtok, 2.5);
    assert.equal(pricing.blended_per_mtok, 1.62);
    assert.equal(pricing.image_output_per_mtok, null);
  });

  it("uses image_output pricing when completion pricing is missing", () => {
    const pricing = calculatePricing({
      prompt: "0.0000003",
      completion: "0",
      image_output: "0.00000958083832335329",
    });

    assert.equal(pricing.prompt_per_mtok, 0.3);
    assert.equal(pricing.completion_per_mtok, 9.580838323353289);
    assert.equal(pricing.image_output_per_mtok, 9.580838323353289);
    assert.equal(pricing.blended_per_mtok, 5.8685029940119735);
  });

  it("extracts capabilities from modalities and supported parameters", () => {
    const capabilities = extractCapabilities(
      ["tools", "tool_choice", "response_format", "reasoning"],
      ["text", "image", "file"],
      ["text", "image"],
      64000,
      { input_cache_read: "0.0000001", web_search: "0.014" },
    );

    assert.deepEqual(capabilities, [
      "tool_use",
      "reasoning",
      "structured_output",
      "vision",
      "long_output",
      "prompt_caching",
      "web_search",
      "file_input",
      "image_generation",
    ]);
  });

  it("preserves the Hugging Face model id without inferring its license", () => {
    const model = enrichModel(
      rawModel({
        id: "meta-llama/llama-3.3-70b-instruct",
        name: "Llama 3.3 70B Instruct",
        context_length: 131072,
        hugging_face_id: "meta-llama/Llama-3.3-70B-Instruct",
      }),
    );

    assert.equal(model.context_length, 131072);
    assert.equal(model.hugging_face_id, "meta-llama/Llama-3.3-70B-Instruct");
    assert.equal(Object.hasOwn(model, "description"), false);
    assert.deepEqual(model.input_modalities, ["text"]);
    assert.deepEqual(model.output_modalities, ["text"]);
  });
});
