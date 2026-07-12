export function rawModel(overrides = {}) {
  return {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o mini",
    description: "Small OpenAI model",
    created: 1721260800,
    context_length: 128000,
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
      tokenizer: "GPT",
      instruct_type: null,
    },
    top_provider: {
      context_length: 128000,
      max_completion_tokens: 16384,
      is_moderated: false,
    },
    pricing: {
      prompt: "0.00000015",
      completion: "0.0000006",
    },
    supported_parameters: ["tools", "tool_choice", "response_format"],
    hugging_face_id: null,
    per_request_limits: null,
    default_parameters: {},
    knowledge_cutoff: null,
    expiration_date: null,
    links: {},
    ...overrides,
  };
}

export function enrichedModel(overrides = {}) {
  return {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o mini",
    description: "Small OpenAI model",
    created: 1721260800,
    context_length: 128000,
    max_completion_tokens: 16384,
    modality: "text->text",
    input_modalities: ["text"],
    output_modalities: ["text"],
    is_moderated: false,
    pricing: {
      prompt_per_mtok: 0.15,
      completion_per_mtok: 0.6,
      blended_per_mtok: 0.42,
      cache_read_per_mtok: null,
      cache_write_per_mtok: null,
      web_search_per_request: null,
      image_per_mtok: null,
      image_output_per_mtok: null,
      image_token_per_mtok: null,
    },
    capabilities: ["tool_use", "structured_output"],
    hugging_face_id: null,
    supported_parameters: ["tools", "tool_choice", "response_format"],
    ...overrides,
  };
}

export function sampleModels() {
  return [
    enrichedModel({
      id: "openai/gpt-4o-mini",
      name: "GPT-4o mini",
      created: 1721260800,
      context_length: 128000,
      max_completion_tokens: 16384,
      pricing: {
        prompt_per_mtok: 0.15,
        completion_per_mtok: 0.6,
        blended_per_mtok: 0.42,
        cache_read_per_mtok: null,
        cache_write_per_mtok: null,
        web_search_per_request: null,
        image_per_mtok: null,
        image_output_per_mtok: null,
        image_token_per_mtok: null,
      },
      capabilities: ["tool_use", "structured_output"],
      hugging_face_id: null,
    }),
    enrichedModel({
      id: "meta-llama/llama-3.3-70b-instruct",
      name: "Llama 3.3 70B Instruct",
      created: 1735603200,
      context_length: 131072,
      max_completion_tokens: 8192,
      pricing: {
        prompt_per_mtok: 0.35,
        completion_per_mtok: 0.4,
        blended_per_mtok: 0.38,
        cache_read_per_mtok: null,
        cache_write_per_mtok: null,
        web_search_per_request: null,
        image_per_mtok: null,
        image_output_per_mtok: null,
        image_token_per_mtok: null,
      },
      capabilities: ["tool_use"],
      hugging_face_id: "meta-llama/Llama-3.3-70B-Instruct",
    }),
    enrichedModel({
      id: "google/gemini-2.5-flash-image-preview",
      name: "Gemini 2.5 Flash Image Preview",
      created: 1760000000,
      context_length: 32768,
      max_completion_tokens: null,
      modality: "text+image->text+image",
      input_modalities: ["text", "image"],
      output_modalities: ["text", "image"],
      pricing: {
        prompt_per_mtok: 0.3,
        completion_per_mtok: 9.580838,
        blended_per_mtok: 5.868503,
        cache_read_per_mtok: null,
        cache_write_per_mtok: null,
        web_search_per_request: null,
        image_per_mtok: null,
        image_output_per_mtok: 9.580838,
        image_token_per_mtok: null,
      },
      capabilities: ["vision", "image_generation"],
      hugging_face_id: null,
    }),
    enrichedModel({
      id: "anthropic/claude-sonnet-4",
      name: "Claude Sonnet 4",
      created: 1750000000,
      context_length: 200000,
      max_completion_tokens: 64000,
      modality: "text+image->text",
      input_modalities: ["text", "image"],
      output_modalities: ["text"],
      pricing: {
        prompt_per_mtok: 3,
        completion_per_mtok: 15,
        blended_per_mtok: 10.2,
        cache_read_per_mtok: null,
        cache_write_per_mtok: null,
        web_search_per_request: null,
        image_per_mtok: null,
        image_output_per_mtok: null,
        image_token_per_mtok: null,
      },
      capabilities: ["vision", "tool_use", "reasoning"],
      hugging_face_id: null,
    }),
  ];
}

export function sampleRankings() {
  return {
    metadata: {
      source: "test",
      fetched_at: new Date().toISOString(),
      ttl_hours: 24,
    },
    popularity: [
      { id: "google/gemini-2.5-flash-image-preview", rank: 1 },
      { id: "openai/gpt-4o-mini", rank: 2 },
      { id: "anthropic/claude-sonnet-4", rank: 3 },
    ],
    throughput: [
      { id: "openai/gpt-4o-mini", rank: 1 },
      { id: "meta-llama/llama-3.3-70b-instruct", rank: 2 },
    ],
    latency: [
      { id: "meta-llama/llama-3.3-70b-instruct", rank: 1 },
      { id: "openai/gpt-4o-mini", rank: 2 },
    ],
    analytics: {
      "google/gemini-2.5-flash-image-preview": {
        requests: 1000,
        total_tokens: 2000,
        tool_calls: 0,
      },
      "openai/gpt-4o-mini": {
        requests: 500,
        total_tokens: 1000,
        tool_calls: 20,
      },
    },
    categories: [],
  };
}

export function frontendModelsResponse() {
  return {
    data: {
      models: [
        {
          slug: "google/gemini-2.5-flash-image-preview",
          permaslug: "google/gemini-2.5-flash-image-preview",
          name: "Gemini 2.5 Flash Image Preview",
          description: "Image generation model",
          created_at: "2026-01-01T00:00:00.000Z",
          context_length: 32768,
          input_modalities: ["text", "image"],
          output_modalities: ["image"],
          supported_parameters: ["response_format"],
          endpoint: {
            max_completion_tokens: null,
            moderation_required: false,
            supported_parameters: ["response_format"],
            pricing: {
              prompt: "0.0000003",
              completion: "0",
              image_output: "0.00000958083832335329",
            },
          },
        },
      ],
    },
  };
}

export function rankingsResponse(order = "top-weekly") {
  const model = {
    slug: "openai/gpt-4o-mini",
    permaslug: "openai/gpt-4o-mini",
    name: "GPT-4o mini",
  };

  return {
    data: {
      models: [model],
      analytics: {
        "openai/gpt-4o-mini": {
          count: 100,
          total_prompt_tokens: 120,
          total_completion_tokens: 80,
          total_tool_calls: 7,
        },
      },
      categories: {
        "openai/gpt-4o-mini": [
          { category: "programming", rank: 1, volume: 500, count: 50 },
          { category: "Ignored Category", rank: 1, volume: 100, count: 10 },
        ],
      },
    },
  };
}

export function taskSpendResponse() {
  return {
    data: {
      spend: {
        windowDays: 30,
        macroCategories: [
          { key: "agent", label: "Agent", spendShare: 0.4 },
        ],
        tasks: [
          {
            tag: "agent:workflow_execution",
            macroCategory: "agent",
            spendShareOfTotal: 0.2,
            models: [
              { model: "openai/gpt-4o-mini", share: 0.5 },
            ],
          },
        ],
      },
    },
  };
}
