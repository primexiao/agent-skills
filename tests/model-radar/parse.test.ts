import { describe, expect, it } from "bun:test";
import { parseNumericSuffix, parseRange, parseTokens } from "../../skills/model-radar/scripts/parse";

describe("parseNumericSuffix", () => {
  it("parses plain integer", () => {
    expect(parseNumericSuffix("10")).toBe(10);
  });

  it("parses plain float", () => {
    expect(parseNumericSuffix("2.5")).toBe(2.5);
  });

  it("parses k suffix (lowercase)", () => {
    expect(parseNumericSuffix("128k")).toBe(128_000);
  });

  it("parses K suffix (uppercase)", () => {
    expect(parseNumericSuffix("128K")).toBe(128_000);
  });

  it("parses m suffix (lowercase)", () => {
    expect(parseNumericSuffix("1m")).toBe(1_000_000);
  });

  it("parses M suffix (uppercase)", () => {
    expect(parseNumericSuffix("1M")).toBe(1_000_000);
  });

  it("parses fractional with suffix", () => {
    expect(parseNumericSuffix("1.5k")).toBe(1_500);
  });
});

describe("parseRange", () => {
  it("parses ..max (upper bound only)", () => {
    expect(parseRange("..10", "max")).toEqual({ max: 10 });
  });

  it("parses min.. (lower bound only)", () => {
    expect(parseRange("5..", "min")).toEqual({ min: 5 });
  });

  it("parses min..max (full range)", () => {
    expect(parseRange("5..10", "max")).toEqual({ min: 5, max: 10 });
  });

  it("parses bare number with default=max", () => {
    expect(parseRange("10", "max")).toEqual({ max: 10 });
  });

  it("parses bare number with default=min", () => {
    expect(parseRange("128k", "min")).toEqual({ min: 128_000 });
  });

  it("handles suffix in range", () => {
    expect(parseRange("32k..1m", "min")).toEqual({ min: 32_000, max: 1_000_000 });
  });
});

describe("parseTokens", () => {
  it("defaults to list command with default sort and top", () => {
    const result = parseTokens([]);
    expect(result.command).toBe("list");
    if (result.command === "list") {
      expect(result.sort).toBe("new");
      expect(result.top).toBe(20);
    }
  });

  it("parses list with sort and top", () => {
    const result = parseTokens(["list", "sort:cheap", "top:5"]);
    expect(result.command).toBe("list");
    if (result.command === "list") {
      expect(result.sort).toBe("cheap");
      expect(result.top).toBe(5);
    }
  });

  it("parses price filter", () => {
    const result = parseTokens(["list", "price:..10"]);
    if (result.command === "list") {
      expect(result.constraints.price).toEqual({ max: 10 });
    }
  });

  it("parses ctx filter with k suffix", () => {
    const result = parseTokens(["list", "ctx:128k"]);
    if (result.command === "list") {
      expect(result.constraints.context).toEqual({ min: 128_000 });
    }
  });

  it("parses out filter", () => {
    const result = parseTokens(["list", "out:32k.."]);
    if (result.command === "list") {
      expect(result.constraints.output).toEqual({ min: 32_000 });
    }
  });

  it("parses cap filter with multiple values", () => {
    const result = parseTokens(["list", "cap:vision,tool_use"]);
    if (result.command === "list") {
      expect(result.constraints.capabilities).toEqual(["vision", "tool_use"]);
    }
  });

  it("parses in filter", () => {
    const result = parseTokens(["list", "in:image,audio"]);
    if (result.command === "list") {
      expect(result.constraints.input_modalities).toEqual(["image", "audio"]);
    }
  });

  it("parses gen filter", () => {
    const result = parseTokens(["list", "gen:image"]);
    if (result.command === "list") {
      expect(result.constraints.output_modalities).toEqual(["image"]);
    }
  });

  it("parses open filter", () => {
    const result = parseTokens(["list", "open:true"]);
    if (result.command === "list") {
      expect(result.constraints.open_source).toBe(true);
    }
  });

  it("parses full compound list query", () => {
    const result = parseTokens([
      "list", "sort:popular", "price:..10", "cap:vision,tool_use", "ctx:128k", "top:5",
    ]);
    expect(result.command).toBe("list");
    if (result.command === "list") {
      expect(result.sort).toBe("popular");
      expect(result.top).toBe(5);
      expect(result.constraints.price).toEqual({ max: 10 });
      expect(result.constraints.capabilities).toEqual(["vision", "tool_use"]);
      expect(result.constraints.context).toEqual({ min: 128_000 });
    }
  });

  it("parses recommend with preset", () => {
    const result = parseTokens(["recommend", "preset:coding", "price:..5", "top:3"]);
    expect(result.command).toBe("recommend");
    if (result.command === "recommend") {
      expect(result.preset).toBe("coding");
      expect(result.top).toBe(3);
      expect(result.constraints.price).toEqual({ max: 5 });
    }
  });

  it("parses compare with positional model names", () => {
    const result = parseTokens(["compare", "claude-sonnet-4", "gpt-4o", "gemini-2.5-flash"]);
    expect(result.command).toBe("compare");
    if (result.command === "compare") {
      expect(result.models).toEqual(["claude-sonnet-4", "gpt-4o", "gemini-2.5-flash"]);
    }
  });

  it("parses refresh", () => {
    const result = parseTokens(["refresh"]);
    expect(result.command).toBe("refresh");
  });
});
