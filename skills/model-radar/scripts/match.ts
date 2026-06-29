/**
 * Resolve a user query (full id, suffix, or partial) to a single model.
 * Priority:
 *   1) exact id ("anthropic/claude-sonnet-4.6")
 *   2) suffix-exact ("claude-sonnet-4.6" → "anthropic/claude-sonnet-4.6",
 *      but NOT "anthropic/claude-sonnet-4.6-fast")
 *   3) partial substring match on id or name — newest `created` wins
 *      so "claude-sonnet-4" prefers 4.6 over 4.0
 */
export function findModelMatch<
  T extends { id: string; name: string; created: number },
>(models: T[], query: string): T | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const exact = models.find((m) => m.id.toLowerCase() === q);
  if (exact) return exact;

  const suffix = "/" + q;
  const suffixHits = models.filter((m) => m.id.toLowerCase().endsWith(suffix));
  if (suffixHits.length > 0) {
    return suffixHits.reduce((a, b) => (b.created > a.created ? b : a));
  }

  const partialHits = models.filter(
    (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
  );
  if (partialHits.length === 0) return null;
  return partialHits.reduce((a, b) => (b.created > a.created ? b : a));
}
