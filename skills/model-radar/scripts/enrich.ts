import type { Capability, EnrichedModel, OpenRouterRawModel } from "./types";

const PER_MTOK = 1_000_000;

/**
 * Convert raw per-token string prices to per-million-token numbers,
 * calculate blended price, and handle optional cache/web_search fields.
 */
export function calculatePricing(
  raw: OpenRouterRawModel["pricing"],
  promptWeight = 0.4,
  completionWeight = 0.6,
): EnrichedModel["pricing"] {
  const prompt_per_mtok = parseFloat(raw.prompt) * PER_MTOK;
  const completion_per_mtok = parseFloat(raw.completion) * PER_MTOK;
  const blended_per_mtok =
    prompt_per_mtok * promptWeight + completion_per_mtok * completionWeight;

  const cache_read_per_mtok =
    raw.input_cache_read != null
      ? parseFloat(raw.input_cache_read) * PER_MTOK
      : null;

  const cache_write_per_mtok =
    raw.input_cache_write != null
      ? parseFloat(raw.input_cache_write) * PER_MTOK
      : null;

  // web_search is a per-request cost, not per-token
  const web_search_per_request =
    raw.web_search != null ? parseFloat(raw.web_search) : null;

  return {
    prompt_per_mtok,
    completion_per_mtok,
    blended_per_mtok,
    cache_read_per_mtok,
    cache_write_per_mtok,
    web_search_per_request,
  };
}

/**
 * Derive capability labels from model attributes.
 */
export function extractCapabilities(
  supportedParams: string[],
  inputModalities: string[],
  outputModalities: string[],
  maxCompletionTokens: number | null,
  pricing: Partial<OpenRouterRawModel["pricing"]>,
): Capability[] {
  const caps: Capability[] = [];

  // tool_use requires BOTH tools AND tool_choice
  if (supportedParams.includes("tools") && supportedParams.includes("tool_choice")) {
    caps.push("tool_use");
  }

  // reasoning
  if (supportedParams.includes("reasoning") || supportedParams.includes("include_reasoning")) {
    caps.push("reasoning");
  }

  // structured_output
  if (supportedParams.includes("structured_outputs") || supportedParams.includes("response_format")) {
    caps.push("structured_output");
  }

  // vision
  if (inputModalities.includes("image")) {
    caps.push("vision");
  }

  // long_output
  if (maxCompletionTokens != null && maxCompletionTokens >= 32000) {
    caps.push("long_output");
  }

  // prompt_caching — any cache price field > 0
  const cacheRead = pricing.input_cache_read != null ? parseFloat(pricing.input_cache_read) : 0;
  const cacheWrite = pricing.input_cache_write != null ? parseFloat(pricing.input_cache_write) : 0;
  if (cacheRead > 0 || cacheWrite > 0) {
    caps.push("prompt_caching");
  }

  // web_search — web_search price > 0
  const webSearch = pricing.web_search != null ? parseFloat(pricing.web_search) : 0;
  if (webSearch > 0) {
    caps.push("web_search");
  }

  // audio_input
  if (inputModalities.includes("audio")) {
    caps.push("audio_input");
  }

  // video_input
  if (inputModalities.includes("video")) {
    caps.push("video_input");
  }

  // file_input
  if (inputModalities.includes("file")) {
    caps.push("file_input");
  }

  // image_generation
  if (outputModalities.includes("image")) {
    caps.push("image_generation");
  }

  // audio_output
  if (outputModalities.includes("audio")) {
    caps.push("audio_output");
  }

  return caps;
}

/**
 * Convert a raw OpenRouter model into an enriched model with
 * calculated pricing and capability labels.
 */
export function enrichModel(raw: OpenRouterRawModel): EnrichedModel {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    created: raw.created,
    context_length: raw.context_length,
    max_completion_tokens: raw.top_provider.max_completion_tokens,
    modality: raw.architecture.modality,
    input_modalities: raw.architecture.input_modalities,
    output_modalities: raw.architecture.output_modalities,
    is_moderated: raw.top_provider.is_moderated,
    is_open_source: raw.hugging_face_id != null,
    pricing: calculatePricing(raw.pricing),
    capabilities: extractCapabilities(
      raw.supported_parameters,
      raw.architecture.input_modalities,
      raw.architecture.output_modalities,
      raw.top_provider.max_completion_tokens,
      raw.pricing,
    ),
    supported_parameters: raw.supported_parameters,
  };
}
