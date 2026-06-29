import type { OpenRouterApiResponse, RawCache } from "./types";

const API_URL = "https://openrouter.ai/api/v1/models";
const TTL_HOURS = 6;
const FETCH_TIMEOUT_MS = 5_000;

export async function fetchRawModels(): Promise<RawCache> {
  const response = await fetch(API_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }
  const apiResponse = (await response.json()) as OpenRouterApiResponse;

  return {
    metadata: {
      source: API_URL,
      fetched_at: new Date().toISOString(),
      ttl_hours: TTL_HOURS,
      total_models: apiResponse.data.length,
    },
    data: apiResponse.data,
  };
}
