type WithDistance = { distanceKm?: number | null };

/**
 * Merges a real-coach result set with the mock-coach one and sorts the
 * combined list by distance (closest first, unknown-distance last) — the
 * same `[...real, ...mock].sort(...)` idiom was duplicated across
 * search/page.tsx and both discipline/riding-instructor area routes.
 */
export function mergeAndSortByDistance<A extends WithDistance, B extends WithDistance>(
  real: A[],
  mock: B[]
): (A | B)[] {
  return [...real, ...mock].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}
