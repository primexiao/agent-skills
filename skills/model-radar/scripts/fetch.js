const API_URL = "https://openrouter.ai/api/frontend/v1/models/find";
const TTL_HOURS = 6;
const FETCH_TIMEOUT_MS = 10_000;
function buildModelsUrl() {
    const url = new URL(API_URL);
    url.searchParams.set("active", "true");
    url.searchParams.set("fmt", "cards");
    return url.toString();
}
function priceString(pricing, key) {
    const value = pricing[key];
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "0";
}
function optionalPriceString(pricing, key) {
    const value = pricing[key];
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return undefined;
}
function timestampSeconds(value) {
    if (!value) return 0;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}
function toRawModel(model) {
    const endpoint = model.endpoint ?? {};
    const pricing = endpoint.pricing ?? model.pricing ?? {};
    const inputModalities = model.input_modalities ?? [];
    const outputModalities = model.output_modalities ?? [];
    const contextLength = model.context_length ?? endpoint.context_length ?? 0;
    return {
        id: model.slug,
        name: model.name,
        description: model.description ?? "",
        created: timestampSeconds(model.created_at),
        context_length: contextLength,
        architecture: {
            modality: `${inputModalities.join("+") || "unknown"}->${outputModalities.join("+") || "unknown"}`,
            input_modalities: inputModalities,
            output_modalities: outputModalities,
            tokenizer: "unknown",
            instruct_type: null
        },
        pricing: {
            prompt: priceString(pricing, "prompt"),
            completion: priceString(pricing, "completion"),
            input_cache_read: optionalPriceString(pricing, "input_cache_read"),
            input_cache_write: optionalPriceString(pricing, "input_cache_write"),
            web_search: optionalPriceString(pricing, "web_search"),
            image: optionalPriceString(pricing, "image"),
            image_output: optionalPriceString(pricing, "image_output"),
            image_token: optionalPriceString(pricing, "image_token")
        },
        top_provider: {
            context_length: contextLength,
            max_completion_tokens: endpoint.max_completion_tokens ?? null,
            is_moderated: endpoint.moderation_required ?? false
        },
        supported_parameters: endpoint.supported_parameters ?? model.supported_parameters ?? [],
        hugging_face_id: model.hf_slug || null,
        per_request_limits: null,
        default_parameters: model.default_parameters ?? {},
        knowledge_cutoff: model.knowledge_cutoff ?? null,
        expiration_date: null,
        links: {}
    };
}
export async function fetchRawModels() {
    const response = await fetch(buildModelsUrl(), {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }
    const apiResponse = await response.json();
    const models = apiResponse.data.models.map(toRawModel);
    return {
        metadata: {
            source: API_URL,
            fetched_at: new Date().toISOString(),
            ttl_hours: TTL_HOURS,
            total_models: models.length
        },
        data: models
    };
}
