import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findModelMatch } from "../../skills/model-radar/scripts/match.js";
import { enrichedModel } from "./fixtures.js";

const MODELS = [
  enrichedModel({
    id: "openai/gpt-4o",
    name: "GPT-4o",
  }),
  enrichedModel({
    id: "openai/gpt-4o-2024-08-06",
    name: "GPT-4o 2024-08-06",
    created: 1722902400,
  }),
  enrichedModel({
    id: "openai/gpt-4o-2024-11-20",
    name: "GPT-4o 2024-11-20",
    created: 1732060800,
  }),
  enrichedModel({
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
  }),
];

describe("match", () => {
  it("prefers exact id matches", () => {
    assert.equal(findModelMatch(MODELS, "openai/gpt-4o")?.id, "openai/gpt-4o");
  });

  it("matches by suffix", () => {
    assert.equal(findModelMatch(MODELS, "claude-3.5-sonnet")?.id, "anthropic/claude-3.5-sonnet");
  });

  it("picks the newest dated variant for partial matches", () => {
    assert.equal(findModelMatch(MODELS, "gpt-4o-2024")?.id, "openai/gpt-4o-2024-11-20");
  });

  it("returns null when no model matches", () => {
    assert.equal(findModelMatch(MODELS, "not-a-model"), null);
  });
});
