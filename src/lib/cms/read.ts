import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { FALLBACK_PROFESSIONS, type Profession } from "@/lib/professions";
import { topDisciplines } from "@/lib/disciplines";
import { CONTENT_DEFAULTS, type ContentKey, type ContentValue } from "@/lib/cms/content-defaults";

/**
 * The CMS read layer (The Site as a CMS §04, stage 2). Everything a visitor
 * reads that admin can change comes through here: professions, menu picks,
 * page copy. Each read:
 *
 *  - uses the cookie-free public client, so the pages that call it can stay
 *    static;
 *  - is cached for CMS_REVALIDATE seconds under the CMS_TAG tag, which admin
 *    saves clear (revalidateTag(CMS_TAG, { expire: 0 })) so an edit is live
 *    at once;
 *  - falls back to the code default when the database is unreachable or a
 *    row is missing or malformed, so a page never renders blank.
 */
export const CMS_TAG = "cms";
const CMS_REVALIDATE = 60;

// ── Professions ─────────────────────────────────────────────────────────────

type Row = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  sort_order: number;
  profession_details: Record<string, unknown> | null;
};

const asSteps = (v: unknown) =>
  Array.isArray(v) ? v.filter((s): s is { title: string; body: string } => typeof s?.title === "string" && typeof s?.body === "string") : [];
const asOptions = (v: unknown) =>
  Array.isArray(v) ? v.filter((s): s is { value: string; label: string } => typeof s?.value === "string" && typeof s?.label === "string") : [];

function toProfession(r: Row): Profession | null {
  const d = r.profession_details;
  if (!d) return null;
  const str = (k: string, fallback = "") => (typeof d[k] === "string" ? (d[k] as string) : fallback);
  const launchState = (["draft", "taking_signups", "live"].includes(str("launch_state")) ? str("launch_state") : "draft") as Profession["launchState"];
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    blurb: r.blurb,
    singular: str("singular", r.name.toLowerCase()),
    plural: str("plural", r.name.toLowerCase()),
    short: str("short_name") || undefined,
    door: str("door") === "coaches" ? "coaches" : "horse_care",
    glyphKey: str("glyph_key", r.slug),
    launchState,
    open: launchState === "live",
    termNoun: str("term_noun", "speciality"),
    termNounPlural: str("term_noun_plural", "specialities"),
    audienceNoun: str("audience_noun", "horse owner"),
    yearsLabel: str("years_label", "years"),
    jobTitle: str("job_title", r.name),
    heroHeadline: str("hero_headline"),
    heroLead: str("hero_lead", r.blurb),
    heroLeadShort: str("hero_lead_short"),
    pitch: str("pitch"),
    steps: asSteps(d.steps),
    enquiryOptions: asOptions(d.enquiry_options),
    eventsEnabled: d.events_enabled !== false,
    remoteAllowed: d.remote_allowed === true,
    sortOrder: r.sort_order,
  };
}

/** Every profession, in menu order. Falls back to FALLBACK_PROFESSIONS. */
export const getProfessions = unstable_cache(
  async (): Promise<Profession[]> => {
    const supabase = createPublicSupabase();
    if (!supabase) return FALLBACK_PROFESSIONS;
    const { data, error } = await supabase
      .from("terms")
      .select("id, slug, name, blurb, sort_order, profession_details(*)")
      .eq("kind", "profession")
      .order("sort_order");
    if (error || !data?.length) return FALLBACK_PROFESSIONS;
    const list = (data as unknown as Row[]).map(toProfession).filter((p): p is Profession => p !== null);
    return list.length ? list : FALLBACK_PROFESSIONS;
  },
  ["cms-professions"],
  { tags: [CMS_TAG], revalidate: CMS_REVALIDATE }
);

export async function getProfession(slug: string): Promise<Profession | undefined> {
  return (await getProfessions()).find((p) => p.slug === slug);
}

// ── Menu picks ──────────────────────────────────────────────────────────────

const FEATURED_FALLBACK = topDisciplines.map(({ slug, name }) => ({ slug, name }));

/**
 * Coaching's featured disciplines (terms.featured), in featured order: the
 * Coaches menu and the home chips. Falls back to the code list if none are
 * ticked or the database can't be reached.
 */
export const getFeaturedDisciplines = unstable_cache(
  async (): Promise<{ slug: string; name: string }[]> => {
    const supabase = createPublicSupabase();
    if (!supabase) return FEATURED_FALLBACK;
    const { data: coaching } = await supabase.from("terms").select("id").eq("kind", "profession").eq("slug", "coaches").maybeSingle();
    if (!coaching) return FEATURED_FALLBACK;
    const { data } = await supabase
      .from("terms")
      .select("slug, name")
      .eq("kind", "discipline")
      .eq("parent_id", coaching.id)
      .eq("featured", true)
      .eq("active", true)
      .order("featured_order");
    return data?.length ? (data as { slug: string; name: string }[]) : FEATURED_FALLBACK;
  },
  ["cms-featured-disciplines"],
  { tags: [CMS_TAG], revalidate: CMS_REVALIDATE }
);

// ── Page copy ───────────────────────────────────────────────────────────────

/**
 * A stored value is accepted only if it has the default's shape: the same
 * keys, each the same kind of thing (text, list of text, list of numbers,
 * list of title/body items). Anything else and the page uses the default.
 */
function sameShape(value: unknown, def: unknown): boolean {
  if (typeof def === "string") return typeof value === "string";
  if (Array.isArray(def)) {
    if (!Array.isArray(value)) return false;
    const sample = def[0];
    if (sample === undefined) return true;
    return value.every((v) => sameShape(v, sample));
  }
  if (typeof def === "number") return typeof value === "number";
  if (def && typeof def === "object") {
    if (!value || typeof value !== "object") return false;
    return Object.keys(def).every((k) => sameShape((value as Record<string, unknown>)[k], (def as Record<string, unknown>)[k]));
  }
  return false;
}

const loadBlocks = unstable_cache(
  async (): Promise<Record<string, unknown>> => {
    const supabase = createPublicSupabase();
    if (!supabase) return {};
    const { data } = await supabase.from("content_blocks").select("key, value");
    return Object.fromEntries((data ?? []).map((r) => [r.key as string, r.value]));
  },
  ["cms-content-blocks"],
  { tags: [CMS_TAG], revalidate: CMS_REVALIDATE }
);

/** One block of page copy: the stored value when valid, else the code default. */
export async function getContent<K extends ContentKey>(key: K): Promise<ContentValue<K>> {
  const def = CONTENT_DEFAULTS[key];
  const stored = (await loadBlocks())[key];
  return (stored !== undefined && sameShape(stored, def) ? stored : def) as ContentValue<K>;
}

/** "{listed_price}" and friends, filled in; unknown names are left as written. */
export function fillVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{([a-z_]+)\}/g, (m, name: string) => vars[name] ?? m);
}
