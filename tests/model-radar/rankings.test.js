import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractAnalytics,
  extractCategories,
  extractRankings,
  fetchRankings,
} from "../../skills/model-radar/scripts/rankings.js";
import { rankingsResponse, taskSpendResponse } from "./fixtures.js";
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
      tool_call_error_requests: 0,
      reasoning_tokens: 0,
      cached_tokens: 0,
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
      if (url.endsWith("/rankings/task-spend")) {
        return jsonResponse(taskSpendResponse());
      }
      const order = new URL(url).searchParams.get("order");
      return jsonResponse(rankingsResponse(order));
    });

    const rankings = await fetchRankings();

    assert.equal(calls.length, 4);
    assert.deepEqual(
      calls
        .map((call) => new URL(call.url).searchParams.get("order"))
        .filter(Boolean)
        .sort(),
      ["latency-low-to-high", "throughput-high-to-low", "top-weekly"],
    );
    assert.equal(calls.filter((call) => call.url.endsWith("/rankings/task-spend")).length, 1);
    assert.deepEqual(rankings.popularity, [{ id: "openai/gpt-4o-mini", rank: 1 }]);
    assert.deepEqual(rankings.throughput, [{ id: "openai/gpt-4o-mini", rank: 1 }]);
    assert.deepEqual(rankings.latency, [{ id: "openai/gpt-4o-mini", rank: 1 }]);
    assert.deepEqual(rankings.tasks, {
      window_days: 30,
      macro_categories: [{ key: "agent", label: "Agent", spend_share: 0.4 }],
      tasks: [
        {
          tag: "agent:workflow_execution",
          macro: "agent",
          spend_share_of_total: 0.2,
          top_models: [{ id: "openai/gpt-4o-mini", spend_share: 0.5 }],
        },
      ],
    });
  });
});
