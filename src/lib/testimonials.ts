import type { SupabaseClient } from "@supabase/supabase-js";
import type { createServiceSupabase } from "@/lib/supabase/service";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import { primaryProfessionOf } from "@/lib/coach-events";
import { sendEmail } from "@/lib/email";
import { memberEmails } from "@/lib/reviews";
import { getPlanCapabilities } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site-url";
import { hasTestimonialTools } from "@/lib/tiers";

/**
 * Testimonials (migration 0021): quotes the professional chooses to show,
 * labelled "Provided by the business" and never part of the rating. Rider
 * reviews (src/lib/reviews.ts) are the independent ones; keep the two apart.
 *
 * Every plan can type them in, edit their own, hide and order them, as many
 * as they like. Plans with `testimonialTools` (Spotlight and up by default)
 * also get the request link (/testimonial/<slug>), where a client writes
 * one that waits for the professional to show it, and pinning one to the
 * top. On a downgrade nothing is deleted: the pin just stops counting and
 * the link stops taking new ones.
 */
type Service = NonNullable<ReturnType<typeof createServiceSupabase>>;

export const TESTIMONIAL_LIMITS = { quote: 800, quoteMin: 20, name: 80, place: 60 } as const;

export type Testimonial = {
  id: string;
  quote: string;
  authorName: string;
  authorPlace: string;
  status: "pending" | "shown" | "declined";
  source: "added" | "request";
  pinned: boolean;
  sortOrder: number;
  createdAt: string;
};

const COLUMNS = "id, quote, author_name, author_place, status, source, pinned, sort_order, created_at";

function toTestimonial(r: Record<string, unknown>): Testimonial {
  return {
    id: r.id as string,
    quote: r.quote as string,
    authorName: r.author_name as string,
    authorPlace: (r.author_place as string) ?? "",
    status: r.status as Testimonial["status"],
    source: r.source as Testimonial["source"],
    pinned: Boolean(r.pinned),
    sortOrder: Number(r.sort_order ?? 0),
    createdAt: r.created_at as string,
  };
}

/** Every testimonial a provider has, for their dashboard: shown in order, then waiting, then hidden. */
export async function getAllTestimonials(client: SupabaseClient, providerId: string): Promise<Testimonial[]> {
  const { data } = await client.from("testimonials").select(COLUMNS).eq("provider_id", providerId).order("sort_order").order("created_at", { ascending: false });
  return (data ?? []).map(toTestimonial);
}

/**
 * What a profile shows: shown testimonials, the pinned one first when the
 * plan still includes pinning, then the professional's order.
 */
export async function getShownTestimonials(client: SupabaseClient, providerId: string, pinCounts: boolean): Promise<Testimonial[]> {
  const { data } = await client.from("testimonials").select(COLUMNS).eq("provider_id", providerId).eq("status", "shown").order("sort_order").order("created_at", { ascending: false });
  const list = (data ?? []).map(toTestimonial);
  if (!pinCounts) return list;
  return [...list.filter((t) => t.pinned), ...list.filter((t) => !t.pinned)];
}

/** Whether this provider's plan includes the request link and pinning. */
export async function providerHasTools(client: SupabaseClient, providerId: string): Promise<boolean> {
  const [{ data: sub }, caps] = await Promise.all([
    client.from("subscriptions").select("tier, status").eq("provider_id", providerId).maybeSingle(),
    getPlanCapabilities(),
  ]);
  return hasTestimonialTools(sub?.tier, sub?.status, caps);
}

/**
 * Who a /testimonial/<slug> link asks on behalf of, or null when the link
 * shouldn't take one: no such profile, a hidden one, or a plan without the
 * request link. A profile still in onboarding can collect them, so it has
 * some by the time it goes live.
 */
export async function testimonialTarget(service: Service, slug: string) {
  const { data: p } = await service.from("providers").select("id, name, slug, status").eq("slug", slug).maybeSingle();
  if (!p || p.status === "hidden") return null;
  if (!(await providerHasTools(service, p.id as string))) return null;
  const professionId = await primaryProfessionOf(p.id as string);
  const professions = await getProfessions();
  const profession = professions.find((x) => x.id === professionId) ?? professions.find((x) => x.slug === "coaches")!;
  return {
    id: p.id as string,
    name: p.name as string,
    slug: p.slug as string,
    firstName: String(p.name).split(" ")[0],
    published: p.status === "published",
    audience: profession.audienceNoun,
  };
}

/** Tell the professional a client's testimonial is waiting for them. */
export async function notifyTestimonialWaiting(service: Service, providerId: string, author: string, quote: string) {
  const { data: p } = await service.from("providers").select("name").eq("id", providerId).maybeSingle();
  const copy = await getContent("email.testimonial_waiting");
  const vars = {
    first_name: String(p?.name ?? "").split(" ")[0] || "there",
    author,
    quote,
    testimonials_url: absoluteUrl("/dashboard/testimonials"),
  };
  for (const to of await memberEmails(service, providerId)) {
    await sendEmail({ to, subject: fillVariables(copy.subject, vars), text: fillVariables(copy.body, vars) });
  }
}

/** "Megan, Bendigo": the name as written, and the town when there is one. */
export function byline(t: Pick<Testimonial, "authorName" | "authorPlace">) {
  return t.authorPlace ? `${t.authorName}, ${t.authorPlace}` : t.authorName;
}
