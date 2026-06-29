import type {
  Capability,
  CliArgs,
  FilterConstraints,
  RangeValue,
  SortOrder,
} from "./types";

const SORT_VALUES = new Set<SortOrder>([
  "cheap", "expensive", "popular", "new", "ctx", "throughput", "latency",
]);

/**
 * Parse numeric string with optional k/m suffix.
 * "128k" → 128000, "1.5m" → 1500000, "10" → 10
 */
export function parseNumericSuffix(value: string): number {
  const lower = value.toLowerCase();
  if (lower.endsWith("m")) return parseFloat(lower.slice(0, -1)) * 1_000_000;
  if (lower.endsWith("k")) return parseFloat(lower.slice(0, -1)) * 1_000;
  return parseFloat(value);
}

/**
 * Parse range syntax: "..10" | "5.." | "5..10" | bare number.
 * bareDefault controls how a bare number is interpreted:
 *   "max" → bare 10 means { max: 10 } (price: under budget)
 *   "min" → bare 128k means { min: 128000 } (ctx: at least)
 */
export function parseRange(value: string, bareDefault: "min" | "max"): RangeValue {
  if (value.includes("..")) {
    const dotIdx = value.indexOf("..");
    const minStr = value.slice(0, dotIdx);
    const maxStr = value.slice(dotIdx + 2);
    return {
      min: minStr ? parseNumericSuffix(minStr) : undefined,
      max: maxStr ? parseNumericSuffix(maxStr) : undefined,
    };
  }
  const num = parseNumericSuffix(value);
  return bareDefault === "max" ? { max: num } : { min: num };
}

/**
 * Parse Tailwind-style token:value CLI arguments into typed CliArgs.
 *
 * Grammar: {command} [token:value] ...
 * Tokens: sort, price, ctx, out, cap, in, gen, open, top, preset
 */
export function parseTokens(args: string[]): CliArgs {
  const command = (args[0] ?? "list") as string;

  if (command === "compare") {
    return { command: "compare", models: args.slice(1) };
  }

  if (command === "refresh") {
    return { command: "refresh" };
  }

  const isRecommend = command === "recommend";
  const tokens = args.slice(1);
  const constraints: FilterConstraints = {};
  let sort: SortOrder = "new";
  let top = isRecommend ? 3 : 20;
  let preset = "coding";

  for (const token of tokens) {
    const colonIdx = token.indexOf(":");
    if (colonIdx === -1) continue;
    const key = token.slice(0, colonIdx);
    const value = token.slice(colonIdx + 1);

    switch (key) {
      case "sort":
        if (SORT_VALUES.has(value as SortOrder)) sort = value as SortOrder;
        break;
      case "price":
        constraints.price = parseRange(value, "max");
        break;
      case "ctx":
        constraints.context = parseRange(value, "min");
        break;
      case "out":
        constraints.output = parseRange(value, "min");
        break;
      case "cap":
        constraints.capabilities = value.split(",").map((s) => s.trim()) as Capability[];
        break;
      case "in":
        constraints.input_modalities = value.split(",").map((s) => s.trim());
        break;
      case "gen":
        constraints.output_modalities = value.split(",").map((s) => s.trim());
        break;
      case "open":
        constraints.open_source = value === "true";
        break;
      case "top":
        top = parseInt(value, 10);
        break;
      case "preset":
        preset = value;
        break;
    }
  }

  if (isRecommend) {
    return { command: "recommend", top, preset, constraints };
  }
  return { command: "list", top, sort, constraints };
}
