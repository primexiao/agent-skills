export const CAPABILITIES = [
    "tool_use",
    "reasoning",
    "structured_output",
    "vision",
    "long_output",
    "prompt_caching",
    "web_search",
    "audio_input",
    "video_input",
    "file_input",
    "image_generation",
    "audio_output"
];
export const TIER1_CATEGORIES = [
    "academia",
    "finance",
    "health",
    "legal",
    "marketing",
    "marketing/seo",
    "programming",
    "roleplay",
    "science",
    "technology",
    "translation",
    "trivia"
];
export function isTier1Category(value) {
    return TIER1_CATEGORIES.includes(value);
}
