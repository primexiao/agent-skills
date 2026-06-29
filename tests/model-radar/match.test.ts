import { describe, expect, it } from "bun:test";
import { findModelMatch } from "../../skills/model-radar/scripts/match";

const models = [
  { id: "anthropic/claude-sonnet-4", name: "Anthropic: Claude Sonnet 4", created: 100 },
  { id: "anthropic/claude-sonnet-4.6", name: "Anthropic: Claude Sonnet 4.6", created: 300 },
  { id: "anthropic/claude-opus-4.8", name: "Anthropic: Claude Opus 4.8", created: 400 },
  { id: "anthropic/claude-opus-4.8-fast", name: "Anthropic: Claude Opus 4.8 (Fast)", created: 410 },
  { id: "openai/gpt-4o", name: "OpenAI: GPT-4o", created: 200 },
];

describe("findModelMatch", () => {
  it("exact id wins even when a newer partial-match exists", () => {
    expect(findModelMatch(models, "anthropic/claude-sonnet-4")?.id).toBe(
      "anthropic/claude-sonnet-4",
    );
  });

  it("suffix-exact resolves the vendor prefix", () => {
    expect(findModelMatch(models, "claude-sonnet-4")?.id).toBe(
      "anthropic/claude-sonnet-4",
    );
  });

  it("suffix-exact does not leak into -fast variants", () => {
    expect(findModelMatch(models, "claude-opus-4.8")?.id).toBe(
      "anthropic/claude-opus-4.8",
    );
  });

  it("suffix-exact is case-insensitive (mixed case must not fall through to partial)", () => {
    expect(findModelMatch(models, "Claude-Opus-4.8")?.id).toBe(
      "anthropic/claude-opus-4.8",
    );
  });

  it("partial match picks the newest created", () => {
    expect(findModelMatch(models, "claude-sonnet")?.id).toBe(
      "anthropic/claude-sonnet-4.6",
    );
  });

  it("matches case-insensitively against the display name", () => {
    expect(findModelMatch(models, "gpt-4O")?.id).toBe("openai/gpt-4o");
  });

  it("returns null when nothing matches", () => {
    expect(findModelMatch(models, "nonexistent-model")).toBeNull();
  });

  it("returns null for empty or whitespace query", () => {
    expect(findModelMatch(models, "")).toBeNull();
    expect(findModelMatch(models, "   ")).toBeNull();
  });
});
