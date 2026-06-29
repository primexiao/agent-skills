import type { EnrichedModel, Preset, ScoredModel } from "./types";

const MAX_INVERSE_PRICE = 1e9;

/**
 * Min-max normalization. Returns 0 when min === max to avoid division by zero.
 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

/**
 * Score and rank models against a preset using weighted min-max normalization.
 *
 * Formula per model:
 *   score = w_cost    × normalize(inversePrice)
 *         + w_context × normalize(context_length)
 *         + w_output  × normalize(max_completion_tokens ?? 0)
 *         + w_capability × (matchedCapabilities / requiredCapabilities)
 */
export function scoreModels(
  models: EnrichedModel[],
  preset: Preset,
): ScoredModel[] {
  if (models.length === 0) return [];

  const { weights, required_capabilities } = preset;

  // --- Compute raw dimension values ---

  const inversePrices = models.map((m) =>
    m.pricing.blended_per_mtok === 0
      ? MAX_INVERSE_PRICE
      : 1 / m.pricing.blended_per_mtok,
  );

  const contextLengths = models.map((m) => m.context_length);
  const outputLengths = models.map((m) => m.max_completion_tokens ?? 0);

  // --- Min/max for normalization ---

  const ipMin = Math.min(...inversePrices);
  const ipMax = Math.max(...inversePrices);

  const ctxMin = Math.min(...contextLengths);
  const ctxMax = Math.max(...contextLengths);

  const outMin = Math.min(...outputLengths);
  const outMax = Math.max(...outputLengths);

  // --- Score each model ---

  const scored: ScoredModel[] = models.map((model, i) => {
    const costScore = normalize(inversePrices[i], ipMin, ipMax);
    const contextScore = normalize(contextLengths[i], ctxMin, ctxMax);
    const outputScore = normalize(outputLengths[i], outMin, outMax);

    let capabilityScore: number;
    if (required_capabilities.length === 0) {
      capabilityScore = 1.0;
    } else {
      const matched = required_capabilities.filter((cap) =>
        model.capabilities.includes(cap),
      ).length;
      capabilityScore = matched / required_capabilities.length;
    }

    const score =
      weights.cost * costScore +
      weights.context * contextScore +
      weights.output * outputScore +
      weights.capability * capabilityScore;

    return {
      model,
      score,
      score_breakdown: {
        cost: costScore,
        context: contextScore,
        output: outputScore,
        capability: capabilityScore,
      },
    };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored;
}
