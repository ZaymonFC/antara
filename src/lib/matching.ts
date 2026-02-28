/**
 * Activity name matching with fuzzy suggestions
 */

export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

export type MatchResult =
  | { kind: "exact"; name: string }
  | { kind: "suggestions"; names: string[] }
  | { kind: "none" };

export function matchActivity(query: string, names: string[]): MatchResult {
  const lower = query.toLowerCase();

  const exact = names.find((n) => n.toLowerCase() === lower);
  if (exact) return { kind: "exact", name: exact };

  const scored = names
    .map((n) => ({ name: n, dist: levenshtein(lower, n.toLowerCase()) }))
    .filter((s) => s.dist <= 3)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3);

  if (scored.length > 0) {
    return { kind: "suggestions", names: scored.map((s) => s.name) };
  }

  return { kind: "none" };
}
