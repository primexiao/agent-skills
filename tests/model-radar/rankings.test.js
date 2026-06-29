import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractAnalytics,
  extractCategories,
  extractRankings,
  fetchRankings,
} from "../../skills/model-radar/scripts/rankings.js";
import { rankingsResponse } from "./fixtures.js";
import { jsonResponse, mockFetch } from "./helpers.js";

describe("rankings", () => {
  it("extracts rank maps from frontend ranking payloads", () => {
    const rankings = extractRankings(rankingsResponse("top-weekly").data.models);

    assert.deepEqual(rankings, [{ id: "openai/gpt-4o-mini", rank: 1 }]);
  });

  it("extracts usage analytics by model id", () => {
    const permaToSlug = new Map([["openai/gpt-4o-mini", "openai/gpt-4o-mini"]]);
    const analytics = extractAnalytics(rankingsResponse("top-weekly").data.analytics, permaToSlug);

    assert.deepEqual(analytics["openai/gpt-4o-mini"], {
      requests: 100,
      total_tokens: 200,
      tool_calls: 7,
    });
  });

  it("keeps only tier-1 categories", () => {
    const permaToSlug = new Map([["openai/gpt-4o-mini", "openai/gpt-4o-mini"]]);
    const categories = extractCategories(rankingsResponse("top-weekly").data.categories, permaToSlug);

    assert.deepEqual(categories, [
      {
        model_id: "openai/gpt-4o-mini",
        category: "programming",
        rank: 1,
        volume: 500,
        count: 50,
      },
    ]);
  });

  it("fetches all ranking sorts from the frontend endpoint", async (t) => {
    const calls = mockFetch(t, (url) => {
      const order = new URL(url).searchParams.get("order");
      return jsonResponse(rankingsResponse(order));
    });

    const rankings = await fetchRankings();

    assert.equal(calls.length, 3);
    assert.deepEqual(
      calls.map((call) => new URL(call.url).searchParams.get("order")).sort(),
      ["latency-low-to-high", "throughput-high-to-low", "top-weekly"],
    );
    assert.deepEqual(rankings.popularity, [{ id: "openai/gpt-4o-mini", rank: 1 }]);
    assert.deepEqual(rankings.throughput, [{ id: "openai/gpt-4o-mini", rank: 1 }]);
    assert.deepEqual(rankings.latency, [{ id: "openai/gpt-4o-mini", rank: 1 }]);
  });
});
