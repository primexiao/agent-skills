import type { EnrichedModel, FilterConstraints, RangeValue } from "./types";

/**
 * Check if a numeric value falls within a range.
 * Undefined bounds are treated as unbounded.
 */
export function matchesRange(value: number, range: RangeValue): boolean {
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

/**
 * Filter models by constraints. All constraints are AND-ed.
 * Undefined constraint fields are skipped.
 */
export function filterModels(
  models: EnrichedModel[],
  constraints: FilterConstraints,
): EnrichedModel[] {
  return models.filter((model) => {
    if (constraints.price && !matchesRange(model.pricing.blended_per_mtok, constraints.price)) {
      return false;
    }

    if (constraints.context && !matchesRange(model.context_length, constraints.context)) {
      return false;
    }

    if (constraints.output) {
      if (model.max_completion_tokens === null) return false;
      if (!matchesRange(model.max_completion_tokens, constraints.output)) return false;
    }

    if (constraints.capabilities) {
      for (const cap of constraints.capabilities) {
        if (!model.capabilities.includes(cap)) return false;
      }
    }

    if (constraints.input_modalities) {
      for (const mod of constraints.input_modalities) {
        if (!model.input_modalities.includes(mod)) return false;
      }
    }

    if (constraints.output_modalities) {
      for (const mod of constraints.output_modalities) {
        if (!model.output_modalities.includes(mod)) return false;
      }
    }

    if (constraints.open_source !== undefined && model.is_open_source !== constraints.open_source) {
      return false;
    }

    return true;
  });
}
