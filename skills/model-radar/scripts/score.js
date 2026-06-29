const MAX_INVERSE_PRICE = 1e9;
export function normalize(value, min, max) {
    if (max === min) return 0;
    return (value - min) / (max - min);
}
export function scoreModels(models, preset) {
    if (models.length === 0) return [];
    const { weights, required_capabilities } = preset;
    const inversePrices = models.map((m)=>m.pricing.blended_per_mtok === 0 ? MAX_INVERSE_PRICE : 1 / m.pricing.blended_per_mtok);
    const contextLengths = models.map((m)=>m.context_length);
    const outputLengths = models.map((m)=>m.max_completion_tokens ?? 0);
    const ipMin = Math.min(...inversePrices);
    const ipMax = Math.max(...inversePrices);
    const ctxMin = Math.min(...contextLengths);
    const ctxMax = Math.max(...contextLengths);
    const outMin = Math.min(...outputLengths);
    const outMax = Math.max(...outputLengths);
    const scored = models.map((model, i)=>{
        const costScore = normalize(inversePrices[i], ipMin, ipMax);
        const contextScore = normalize(contextLengths[i], ctxMin, ctxMax);
        const outputScore = normalize(outputLengths[i], outMin, outMax);
        let capabilityScore;
        if (required_capabilities.length === 0) {
            capabilityScore = 1.0;
        } else {
            const matched = required_capabilities.filter((cap)=>model.capabilities.includes(cap)).length;
            capabilityScore = matched / required_capabilities.length;
        }
        const score = weights.cost * costScore + weights.context * contextScore + weights.output * outputScore + weights.capability * capabilityScore;
        return {
            model,
            score,
            score_breakdown: {
                cost: costScore,
                context: contextScore,
                output: outputScore,
                capability: capabilityScore
            }
        };
    });
    scored.sort((a, b)=>b.score - a.score);
    return scored;
}
