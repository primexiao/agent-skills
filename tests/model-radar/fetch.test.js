import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fetchRawModels } from "../../skills/model-radar/scripts/fetch.js";
import { frontendModelsResponse } from "./fixtures.js";
import { jsonResponse, mockFetch } from "./helpers.js";

describe("fetchRawModels", () => {
  it("uses the OpenRouter frontend cards endpoint and maps cards to raw models", async (t) => {
    const calls = mockFetch(t, () => jsonResponse(frontendModelsResponse()));

    const models = await fetchRawModels();

    assert.equal(calls.length, 1);
    assert.match(
      calls[0].url,
      /^https:\/\/openrouter\.ai\/api\/frontend\/v1\/models\/find\?active=true&fmt=cards$/,
    );
    assert.equal(models.metadata.source, "https://openrouter.ai/api/frontend/v1/models/find");
    assert.equal(models.metadata.ttl_hours, 6);
    assert.equal(models.metadata.total_models, 1);
    assert.deepEqual(models.data[0], {
      id: "google/gemini-2.5-flash-image-preview",
      name: "Gemini 2.5 Flash Image Preview",
      description: "Image generation model",
      created: 1767225600,
      context_length: 32768,
      architecture: {
        modality: "text+image->image",
        input_modalities: ["text", "image"],
        output_modalities: ["image"],
        tokenizer: "unknown",
        instruct_type: null,
      },
      pricing: {
        prompt: "0.0000003",
        completion: "0",
        input_cache_read: undefined,
        input_cache_write: undefined,
        web_search: undefined,
        image: undefined,
        image_output: "0.00000958083832335329",
        image_token: undefined,
      },
      top_provider: {
        context_length: 32768,
        max_completion_tokens: null,
        is_moderated: false,
      },
      supported_parameters: ["response_format"],
      hugging_face_id: null,
      per_request_limits: null,
      default_parameters: {},
      knowledge_cutoff: null,
      expiration_date: null,
      links: {},
    });
  });

  it("throws with status detail on non-2xx responses", async (t) => {
    mockFetch(t, () => jsonResponse({}, { status: 503, statusText: "Unavailable" }));

    await assert.rejects(
      fetchRawModels(),
      /OpenRouter API error: 503 Unavailable/,
    );
  });
});
