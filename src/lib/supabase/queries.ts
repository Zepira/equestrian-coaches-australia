import type { SupabaseClient } from "@supabase/supabase-js";
import { disciplines as staticDisciplines } from "@/lib/disciplines";
import type { DisciplineContent } from "@/lib/discipline-content";
import { parseState, type AuState } from "@/lib/au-states";
import { createServiceSupabase } from "@/lib/supabase/service";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];

export type TermKind = "discipline" | "skill" | "attribute";

/**
 * A profession's term id, by slug (cached per server process: profession
 * rows are created rarely and never change id). Every coaching read scopes
 * to the "coaches" profession, because disciplines and horse care
 * specialities are the same kind of term (The Site as a CMS §04 C).
 */
const professionIdCache = new Map<string, string>();
export async function getProfessionId(supabase: SupabaseClient, slug: string): Promise<string | null> {
  const cached = professionIdCache.get(slug);
  if (cached) return cached;
  const { data } = await supabase.from("terms").select("id").eq("kind", "profession").eq("slug", slug).maybeSingle();
  const id = (data?.id as string | undefined) ?? null;
  if (id) professionIdCache.set(slug, id);
  return id;
}

/** The coaching profession's id: the parent of every discipline and coaching skill. */
export function getCoachingId(supabase: SupabaseClient) {
  return getProfessionId(supabase, "coaches");
}

// Skills and attributes are stored with sort_order 0, so whatever order the
// database hands back is arbitrary — sort them for display. Disciplines are
// deliberately excluded: their sort_order carries the coach's own ordering,
// lowest first, which is what names their primary discipline.
export function sortByName(names: string[] | undefined) {
  return [...(names ?? [])].sort((a, b) => a.localeCompare(b));
}

// Generic reader for the terms table (phase 9 taxonomy — see CLAUDE.md
// "Search & taxonomy build spec"). Falls back to the static discipline
// list when there's no live Supabase project, or for skills/attributes
// when the table is empty (both cases keep pages working rather than
// throwing).
export async function getTerms(supabase: SupabaseClient | null, kind: TermKind) {
  if (!supabase) return kind === "discipline" ? staticDisciplines.map((d) => ({ id: d.slug, ...d })) : [];

  // Every kind lists alphabetically wherever the full set is shown — search
  // dropdowns, the profile editor, clinic forms, the admin screens. The
  // seeded sort_order is kept on the rows but no longer drives display.
  // Coaching's own disciplines, skills and setup terms, plus the setup terms
  // every profession shares (parent_id null).
  const coachingId = await getCoachingId(supabase);
  let query = supabase.from("terms").select("id, slug, name, blurb").eq("kind", kind).eq("active", true);
  if (coachingId) {
    query = kind === "discipline" ? query.eq("parent_id", coachingId) : query.or(`parent_id.is.null,parent_id.eq.${coachingId}`);
  }
  const { data, error } = await query.order("name");

  if (error || !data || data.length === 0) {
    return kind === "discipline" ? staticDisciplines.map((d) => ({ id: d.slug, ...d })) : [];
  }

  return withAliases(supabase, data);
}

// Search aliases ride along on every term row so any dropdown built from
// them can match "xc" to Eventing or "flatwork" to Dressage — the same
// vocabulary the SEO pages already use (term_aliases, phase 9).
async function withAliases<T extends { id: string }>(supabase: SupabaseClient, rows: T[]): Promise<(T & { aliases: string[] })[]> {
  const { data: aliasRows } = await supabase
    .from("term_aliases")
    .select("term_id, alias")
    .in("term_id", rows.map((t) => t.id));
  const aliasesByTerm = new Map<string, string[]>();
  for (const r of aliasRows ?? []) aliasesByTerm.set(r.term_id, [...(aliasesByTerm.get(r.term_id) ?? []), r.alias]);
  return rows.map((t) => ({ ...t, aliases: aliasesByTerm.get(t.id) ?? [] }));
}

// The discipline rows with their page content (0020_discipline_content.sql):
// what /disciplines, /disciplines/[slug], the sitemap and the homepage
// tiles read. Same static fallback as getTerms when Supabase isn't there.
export const DISCIPLINE_CONTENT_COLUMNS =
  "id, slug, name, blurb, description, image_path, image_alt, image_credit, seo_title, seo_description, active, updated_at";

export async function getDisciplineContent(supabase: SupabaseClient | null): Promise<DisciplineContent[]> {
  if (!supabase) return staticDisciplines.map((d) => ({ id: d.slug, ...d }));
  const coachingId = await getCoachingId(supabase);
  let query = supabase.from("terms").select(DISCIPLINE_CONTENT_COLUMNS).eq("kind", "discipline").eq("active", true);
  if (coachingId) query = query.eq("parent_id", coachingId);
  const { data, error } = await query.order("name");
  if (error || !data || data.length === 0) return staticDisciplines.map((d) => ({ id: d.slug, ...d }));
  return withAliases(supabase, data as DisciplineContent[]);
}

// Kept as the discipline-specific name since it's used all over the app —
// equivalent to getTerms(supabase, "discipline").
export function getDisciplines(supabase: SupabaseClient | null) {
  return getTerms(supabase, "discipline");
}

export function getSkills(supabase: SupabaseClient | null) {
  return getTerms(supabase, "skill");
}

export function getAttributes(supabase: SupabaseClient | null) {
  return getTerms(supabase, "attribute");
}

// Suggested skills/attributes to offer once a coach picks a discipline
// (term_suggestions, curated seed, reseeded by scripts/db/rebuild.mjs).
export async function getSuggestedTerms(supabase: SupabaseClient, disciplineId: string) {
  const { data } = await supabase
    .from("term_suggestions")
    .select("term_id, terms!term_suggestions_term_id_fkey(id, slug, name, kind)")
    .eq("for_term_id", disciplineId)
    .order("sort_order");
  return (data ?? [])
    .map((r) => (r as unknown as { terms: { id: string; slug: string; name: string; kind: TermKind } | null }).terms)
    .filter((t): t is { id: string; slug: string; name: string; kind: TermKind } => Boolean(t));
}

export type ResolvedLocation = {
  postcode: string;
  suburb: string;
  state: string;
  lat: number;
  long: number;
  area_id: string | null;
};

// Resolves free-text like "Bendigo VIC", "3550" or "Toowoomba" against the
// postcodes table (loaded via supabase/scripts/load-postcodes.mjs). Used by
// both the search bar and the coach profile save action, so search and
// listing use exactly the same notion of "where this is". Also carries
// area_id so the profile save action can keep providers.area_id current
// for the indexable_pages register.
export async function resolveLocation(
  supabase: SupabaseClient,
  query: string
): Promise<ResolvedLocation | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const words = trimmed.split(/\s+/);
  const lastWord = words[words.length - 1]?.toUpperCase();
  const stateGuess = AU_STATES.includes(lastWord) ? lastWord : null;
  const withoutState = stateGuess ? words.slice(0, -1).join(" ") : trimmed;

  const postcodeMatch = withoutState.match(/\b\d{4}\b/);
  const suburbGuess = withoutState.replace(/\b\d{4}\b/, "").trim();

  let queryBuilder = supabase.from("postcodes").select("postcode, suburb, state, lat, long, area_id");

  if (postcodeMatch) {
    queryBuilder = queryBuilder.eq("postcode", postcodeMatch[0]);
  } else if (suburbGuess) {
    queryBuilder = queryBuilder.ilike("suburb", suburbGuess);
  } else {
    return null;
  }
  if (stateGuess) queryBuilder = queryBuilder.eq("state", stateGuess);

  let { data } = await queryBuilder.limit(1).maybeSingle();

  // Fall back to a partial suburb match if the exact one missed.
  if (!data && suburbGuess) {
    let fallback = supabase
      .from("postcodes")
      .select("postcode, suburb, state, lat, long, area_id")
      .ilike("suburb", `%${suburbGuess}%`);
    if (stateGuess) fallback = fallback.eq("state", stateGuess);
    const result = await fallback.limit(1).maybeSingle();
    data = result.data;
  }

  if (!data) return null;
  return data;
}

/**
 * What a rider typed into the location field, resolved: a point (town or
 * postcode, from resolveLocation) or a whole state ("VIC", "Victoria") —
 * which searches by providers.state instead of a radius.
 */
export type SearchLocation =
  | ({ kind: "point" } & ResolvedLocation)
  | { kind: "state"; state: AuState };

export async function resolveSearchLocation(supabase: SupabaseClient, query: string): Promise<SearchLocation | null> {
  const state = parseState(query);
  if (state) return { kind: "state", state };
  const point = await resolveLocation(supabase, query);
  return point ? { kind: "point", ...point } : null;
}

export type CoachSearchResult = {
  id: string;
  slug: string;
  name: string;
  headline: string;
  suburb: string;
  state: string;
  distanceKm: number | null;
  disciplineNames: string[];
  skillNames: string[];
  attributeNames: string[];
  photoUrl: string | null;
  lat: number | null;
  long: number | null;
  takingStudents: "yes" | "waitlist" | "no";
  travelRadiusKm: number | null;
};

export type SearchFilters = {
  disciplineIds?: string[];
  skillIds?: string[];
  attributeIds?: string[];
  lat?: number | null;
  long?: number | null;
  radiusKm?: number;
  /** State code (VIC, NSW…) for a state-wide search — no radius applied. */
  state?: string | null;
};

// Runs nearby_providers() scoped to the coaching profession (OR within a
// kind, AND across kinds), then hydrates the thin result rows with what
// CoachCard needs to render (disciplines, a thumbnail) in a second batched
// query, preserving the RPC's distance/match-count ordering.
export async function searchCoaches(
  supabase: SupabaseClient,
  { disciplineIds, skillIds, attributeIds, lat, long, radiusKm = 50, state }: SearchFilters
): Promise<CoachSearchResult[]> {
  const coachingId = await getCoachingId(supabase);
  if (!coachingId) return [];
  const { data: matches, error } = await supabase.rpc("nearby_providers", {
    p_profession_ids: [coachingId],
    p_discipline_ids: disciplineIds?.length ? disciplineIds : null,
    p_skill_ids: skillIds?.length ? skillIds : null,
    p_attribute_ids: attributeIds?.length ? attributeIds : null,
    p_lat: lat ?? null,
    p_long: long ?? null,
    p_radius_km: radiusKm,
    p_state: state ?? null,
  });
  if (error || !matches || matches.length === 0) return [];

  const ids = matches.map((m: { id: string }) => m.id);

  const [{ data: termRows }, { data: photoRows }, { data: providerRows }] = await Promise.all([
    supabase.from("provider_terms").select("provider_id, sort_order, terms(name, kind)").in("provider_id", ids).order("sort_order"),
    supabase.from("provider_photos").select("provider_id, storage_path").in("provider_id", ids).order("sort_order"),
    supabase.from("providers").select("id, lat, long, availability, travel_radius_km").in("id", ids),
  ]);

  const coachById = new Map((providerRows ?? []).map((c) => [c.id as string, c]));
  const namesByKindAndCoach: Record<TermKind, Map<string, string[]>> = {
    discipline: new Map(),
    skill: new Map(),
    attribute: new Map(),
  };
  for (const row of termRows ?? []) {
    const term = (row as unknown as { terms: { name: string; kind: TermKind | "profession" } | null }).terms;
    if (!term || term.kind === "profession") continue;
    const byCoach = namesByKindAndCoach[term.kind];
    const list = byCoach.get(row.provider_id) ?? [];
    list.push(term.name);
    byCoach.set(row.provider_id, list);
  }
  const photoById = new Map<string, string>();
  for (const row of photoRows ?? []) {
    if (!photoById.has(row.provider_id)) {
      photoById.set(row.provider_id, supabase.storage.from(PROVIDER_PHOTOS).getPublicUrl(row.storage_path).data.publicUrl);
    }
  }

  return matches.map((m: { id: string; slug: string; name: string; headline: string; suburb: string; state: string; distance_km: number | null }) => ({
    id: m.id,
    slug: m.slug,
    name: m.name || "Coach",
    headline: m.headline,
    suburb: m.suburb,
    state: m.state,
    distanceKm: m.distance_km,
    disciplineNames: namesByKindAndCoach.discipline.get(m.id) ?? [],
    skillNames: sortByName(namesByKindAndCoach.skill.get(m.id)),
    attributeNames: sortByName(namesByKindAndCoach.attribute.get(m.id)),
    photoUrl: photoById.get(m.id) ?? null,
    lat: (coachById.get(m.id)?.lat as number | null) ?? null,
    long: (coachById.get(m.id)?.long as number | null) ?? null,
    takingStudents: ((coachById.get(m.id)?.availability as "yes" | "waitlist" | "no" | undefined) ?? "yes"),
    travelRadiusKm: (coachById.get(m.id)?.travel_radius_km as number | null) ?? null,
  }));
}

/** Storage buckets for provider media (created by scripts/db/rebuild.mjs). */
export const PROVIDER_PHOTOS = "provider-photos";
export const PROVIDER_VIDEOS = "provider-videos";

export type ProviderRow = Record<string, unknown> & { id: string; slug: string; name: string };

/** The provider a signed-in user edits: the first one they're a member of. */
export async function getMyProvider(supabase: SupabaseClient, userId: string): Promise<ProviderRow | null> {
  const { data } = await supabase
    .from("provider_members")
    .select("providers(*)")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return ((data as unknown as { providers: ProviderRow | null } | null)?.providers ?? null);
}

/**
 * A provider row for this user, creating it (with owner membership and the
 * coaching profession) when there isn't one. New sign-ups get theirs from
 * the signup trigger; this covers accounts that predate it. Creating needs
 * the service role, since members can't insert providers under RLS.
 */
export async function ensureProvider(supabase: SupabaseClient, userId: string, name: string): Promise<ProviderRow> {
  const existing = await getMyProvider(supabase, userId);
  if (existing) return existing;

  const service = createServiceSupabase();
  if (!service) throw new Error("Creating a provider needs SUPABASE_SERVICE_ROLE_KEY.");
  let slug = slugify(name) || "provider";
  const { data: clash } = await service.from("providers").select("id").eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${userId.replace(/-/g, "").slice(0, 6)}`;

  const { data: created, error } = await service.from("providers").insert({ slug, name }).select("*").single();
  if (error) throw error;
  await service.from("provider_members").insert({ provider_id: created.id, user_id: userId, role: "owner" });
  const coachingId = await getCoachingId(service);
  if (coachingId) await service.from("provider_terms").insert({ provider_id: created.id, term_id: coachingId, sort_order: 0 });
  return created as ProviderRow;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

