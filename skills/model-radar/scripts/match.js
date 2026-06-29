export function findModelMatch(models, query) {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const exact = models.find((m)=>m.id.toLowerCase() === q);
    if (exact) return exact;
    const suffix = "/" + q;
    const suffixHits = models.filter((m)=>m.id.toLowerCase().endsWith(suffix));
    if (suffixHits.length > 0) {
        return suffixHits.reduce((a, b)=>b.created > a.created ? b : a);
    }
    const partialHits = models.filter((m)=>m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    if (partialHits.length === 0) return null;
    return partialHits.reduce((a, b)=>b.created > a.created ? b : a);
}
