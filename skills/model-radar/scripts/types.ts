// === Capability labels derived from model attributes ===

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
  "audio_output",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

// === Raw OpenRouter API response ===

export interface OpenRouterApiResponse {
  data: OpenRouterRawModel[];
}

export interface OpenRouterRawModel {
  id: string;
  name: string;
  description: string;
  created: number;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: string;
    completion: string;
    input_cache_read?: string;
    input_cache_write?: string;
    web_search?: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  supported_parameters: string[];
  hugging_face_id: string | null;
  per_request_limits: unknown;
  default_parameters: Record<string, unknown>;
  knowledge_cutoff: string | null;
  expiration_date: string | null;
  links: Record<string, string>;
}

// === Enriched model (stored in cache, consumed by filter/score) ===

export interface EnrichedModel {
  id: string;
  name: string;
  description: string;
  created: number;
  context_length: number;
  max_completion_tokens: number | null;
  modality: string;
  input_modalities: string[];
  output_modalities: string[];
  is_moderated: boolean;
  is_open_source: boolean;
  pricing: {
    prompt_per_mtok: number;
    completion_per_mtok: number;
    blended_per_mtok: number;
    cache_read_per_mtok: number | null;
    cache_write_per_mtok: number | null;
    web_search_per_request: number | null;
  };
  capabilities: Capability[];
  supported_parameters: string[];
}

// === Cache file structure ===

export interface ModelCache {
  metadata: {
    source: string;
    fetched_at: string;
    ttl_hours: number;
    total_models: number;
    enriched: boolean;
  };
  models: EnrichedModel[];
}

// === Range value for token:value filter syntax ===

export interface RangeValue {
  min?: number;
  max?: number;
}

// === Raw API response cache (community-aligned format) ===

export interface RawCache {
  metadata: {
    source: string;
    fetched_at: string;
    ttl_hours: number;
    total_models: number;
  };
  data: OpenRouterRawModel[];
}

// === Tier 1 categories (12 official OpenRouter categories) ===
// Source: GET /api/frontend/models/find?order=top-weekly returns .data.categories
// derived from real developer usage volume on OpenRouter.

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
  "trivia",
] as const;

export type Tier1Category = (typeof TIER1_CATEGORIES)[number];

export function isTier1Category(value: string): value is Tier1Category {
  return (TIER1_CATEGORIES as readonly string[]).includes(value);
}

export interface CategoryRanking {
  model_id: string;       // OpenRouter slug (e.g. "anthropic/claude-sonnet-4")
  category: Tier1Category;
  rank: number;           // 1-indexed position within this category
  volume: number;         // OpenRouter popularity volume score
  count: number;          // request count contributing to this rank
}

// === Rankings cache (from OpenRouter frontend API) ===

export interface RankingsCache {
  metadata: {
    source: string;
    fetched_at: string;
    ttl_hours: number;
  };
  popularity: Array<{ id: string; rank: number }>;
  throughput: Array<{ id: string; rank: number }>;
  latency: Array<{ id: string; rank: number }>;
  analytics: Record<string, {
    requests: number;
    total_tokens: number;
    tool_calls: number;
  }>;
  categories: CategoryRanking[];
}

// === Preset configuration ===

export interface Preset {
  name: string;
  description: string;
  weights: {
    cost: number;
    context: number;
    output: number;
    capability: number;
  };
  required_capabilities: Capability[];
  prompt_completion_ratio: [number, number];
}

export interface PresetsConfig {
  presets: Record<string, Preset>;
}

// === Sort dimensions ===

export type SortOrder = "cheap" | "expensive" | "popular" | "new" | "ctx" | "throughput" | "latency";

// === Filter constraints (parsed from token:value CLI args) ===

export interface FilterConstraints {
  price?: RangeValue;
  context?: RangeValue;
  output?: RangeValue;
  capabilities?: Capability[];
  input_modalities?: string[];
  output_modalities?: string[];
  open_source?: boolean;
}

// === Scored model (filter + score output) ===

export interface ScoredModel {
  model: EnrichedModel;
  score: number;
  score_breakdown: {
    cost: number;
    context: number;
    output: number;
    capability: number;
  };
}

// === CLI command types ===

export type Command = "list" | "recommend" | "compare" | "refresh";

export interface ListArgs {
  command: "list";
  top: number;
  sort: SortOrder;
  constraints: FilterConstraints;
}

export interface RecommendArgs {
  command: "recommend";
  top: number;
  preset: string;
  constraints: FilterConstraints;
}

export interface CompareArgs {
  command: "compare";
  models: string[];
}

export interface RefreshArgs {
  command: "refresh";
}

export type CliArgs = ListArgs | RecommendArgs | CompareArgs | RefreshArgs;
