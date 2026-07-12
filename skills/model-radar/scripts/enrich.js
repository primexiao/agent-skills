const PER_MTOK = 1_000_000;
export function calculatePricing(raw, promptWeight = 0.4, completionWeight = 0.6) {
    const prompt_per_mtok = parseFloat(raw.prompt) * PER_MTOK;
    const rawCompletionPerMtok = parseFloat(raw.completion) * PER_MTOK;
    const image_per_mtok = raw.image != null ? parseFloat(raw.image) * PER_MTOK : null;
    const image_output_per_mtok = raw.image_output != null ? parseFloat(raw.image_output) * PER_MTOK : null;
    const image_token_per_mtok = raw.image_token != null ? parseFloat(raw.image_token) * PER_MTOK : null;
    const completion_per_mtok = rawCompletionPerMtok === 0 && image_output_per_mtok != null && image_output_per_mtok > 0 ? image_output_per_mtok : rawCompletionPerMtok;
    const blended_per_mtok = prompt_per_mtok * promptWeight + completion_per_mtok * completionWeight;
    const cache_read_per_mtok = raw.input_cache_read != null ? parseFloat(raw.input_cache_read) * PER_MTOK : null;
    const cache_write_per_mtok = raw.input_cache_write != null ? parseFloat(raw.input_cache_write) * PER_MTOK : null;
    const web_search_per_request = raw.web_search != null ? parseFloat(raw.web_search) : null;
    return {
        prompt_per_mtok,
        completion_per_mtok,
        blended_per_mtok,
        cache_read_per_mtok,
        cache_write_per_mtok,
        web_search_per_request,
        image_per_mtok,
        image_output_per_mtok,
        image_token_per_mtok
    };
}
export function extractCapabilities(supportedParams, inputModalities, outputModalities, maxCompletionTokens, pricing) {
    const caps = [];
    if (supportedParams.includes("tools") && supportedParams.includes("tool_choice")) {
        caps.push("tool_use");
    }
    if (supportedParams.includes("reasoning") || supportedParams.includes("include_reasoning")) {
        caps.push("reasoning");
    }
    if (supportedParams.includes("structured_outputs") || supportedParams.includes("response_format")) {
        caps.push("structured_output");
    }
    if (inputModalities.includes("image")) {
        caps.push("vision");
    }
    if (maxCompletionTokens != null && maxCompletionTokens >= 32000) {
        caps.push("long_output");
    }
    const cacheRead = pricing.input_cache_read != null ? parseFloat(pricing.input_cache_read) : 0;
    const cacheWrite = pricing.input_cache_write != null ? parseFloat(pricing.input_cache_write) : 0;
    if (cacheRead > 0 || cacheWrite > 0) {
        caps.push("prompt_caching");
    }
    const webSearch = pricing.web_search != null ? parseFloat(pricing.web_search) : 0;
    if (webSearch > 0) {
        caps.push("web_search");
    }
    if (inputModalities.includes("audio")) {
        caps.push("audio_input");
    }
    if (inputModalities.includes("video")) {
        caps.push("video_input");
    }
    if (inputModalities.includes("file")) {
        caps.push("file_input");
    }
    if (outputModalities.includes("image")) {
        caps.push("image_generation");
    }
    if (outputModalities.includes("audio")) {
        caps.push("audio_output");
    }
    return caps;
}
export function enrichModel(raw) {
    return {
        id: raw.id,
        name: raw.name,
        created: raw.created,
        context_length: raw.context_length,
        max_completion_tokens: raw.top_provider.max_completion_tokens,
        modality: raw.architecture.modality,
        input_modalities: raw.architecture.input_modalities,
        output_modalities: raw.architecture.output_modalities,
        is_moderated: raw.top_provider.is_moderated,
        hugging_face_id: raw.hugging_face_id ?? null,
        pricing: calculatePricing(raw.pricing),
        capabilities: extractCapabilities(raw.supported_parameters, raw.architecture.input_modalities, raw.architecture.output_modalities, raw.top_provider.max_completion_tokens, raw.pricing),
        supported_parameters: raw.supported_parameters
    };
}
