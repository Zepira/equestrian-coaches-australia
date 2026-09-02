/**
 * Unwraps one embedded-relation field off a PostgREST join row (e.g. a
 * `.select("title, coach_profiles(slug)")` result's `coach_profiles`).
 * supabase-js's generated types don't reliably reflect an ad-hoc embed
 * shape, so every call site across this codebase independently cast the
 * row with `as unknown as {...}` — same workaround, repeated with a
 * slightly different inline type each time. This centralizes the cast
 * under one named, generic helper instead.
 */
export function joinedRelation<TRelation>(row: unknown, key: string): TRelation | null {
  if (row == null) return null;
  return (row as Record<string, TRelation | null>)[key] ?? null;
}
