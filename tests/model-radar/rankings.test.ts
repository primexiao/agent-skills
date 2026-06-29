import { describe, expect, it } from "bun:test";
import { extractRankings, extractAnalytics } from "../../skills/model-radar/scripts/rankings";

const mockModels = [
  { slug: "deepseek/deepseek-v3.2", permaslug: "deepseek/deepseek-v3.2-20251201" },
  { slug: "minimax/minimax-m2.7", permaslug: "minimax/minimax-m2.7-20260318" },
  { slug: "anthropic/claude-sonnet-4.6", permaslug: "anthropic/claude-4.6-sonnet-20260301" },
];

const mockAnalytics = {
  "deepseek/deepseek-v3.2-20251201": {
    count: 5000,
    total_completion_tokens: 1000000,
    total_prompt_tokens: 2000000,
    total_native_tokens_reasoning: 0,
    num_media_prompt: 0,
    num_media_completion: 0,
    num_audio_prompt: 0,
    total_native_tokens_cached: 0,
    total_tool_calls: 100,
    requests_with_tool_call_errors: 0,
  },
  "anthropic/claude-4.6-sonnet-20260301": {
    count: 12000,
    total_completion_tokens: 5000000,
    total_prompt_tokens: 8000000,
    total_native_tokens_reasoning: 1000000,
    num_media_prompt: 500,
    num_media_completion: 0,
    num_audio_prompt: 0,
    total_native_tokens_cached: 2000000,
    total_tool_calls: 3000,
    requests_with_tool_call_errors: 10,
  },
};

describe("extractRankings", () => {
  it("assigns rank based on array position (1-indexed)", () => {
    const rankings = extractRankings(mockModels);
    expect(rankings).toEqual([
      { id: "deepseek/deepseek-v3.2", rank: 1 },
      { id: "minimax/minimax-m2.7", rank: 2 },
      { id: "anthropic/claude-sonnet-4.6", rank: 3 },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(extractRankings([])).toEqual([]);
  });
});

describe("extractAnalytics", () => {
  it("transforms raw analytics to simplified format, mapping permaslug to slug", () => {
    const permaToSlug = new Map(mockModels.map((m) => [m.permaslug, m.slug]));
    const result = extractAnalytics(mockAnalytics, permaToSlug);
    expect(result["deepseek/deepseek-v3.2"]).toEqual({
      requests: 5000,
      total_tokens: 3000000,
      tool_calls: 100,
    });
    expect(result["anthropic/claude-sonnet-4.6"]).toEqual({
      requests: 12000,
      total_tokens: 13000000,
      tool_calls: 3000,
    });
  });

  it("returns empty object for empty input", () => {
    expect(extractAnalytics({}, new Map())).toEqual({});
  });
});
