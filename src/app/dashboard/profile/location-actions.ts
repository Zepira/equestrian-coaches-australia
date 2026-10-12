"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/provider-session";
import { profilePath } from "@/lib/page-paths";
import { getPlanCapabilities, getPlans } from "@/lib/settings";
import { resolveLocation } from "@/lib/supabase/queries";
import { baseLimit, TIERS } from "@/lib/tiers";
import { titleCase } from "@/lib/text";

/**
 * Extra bases (provider_locations, migration 0022): a professional who works
 * from two or three places. How many count is the plan's `locations`
 * number; the main base on the profile is always one of them. Extras over
 * the plan's number stay saved and dormant (search and area pages skip
 * them) until the plan covers them again.
 */
export type LocationState = { ok: boolean; message: string } | null;

export async function addLocation(_prev: LocationState, fd: FormData): Promise<LocationState> {
  const { supabase, providerId, provider } = await requireProvider();
  const [{ data: sub }, caps, plans] = await Promise.all([
    supabase.from("subscriptions").select("tier, status").eq("provider_id", providerId).maybeSingle(),
    getPlanCapabilities(),
    getPlans(),
  ]);
  const limit = baseLimit(sub?.tier, sub?.status, caps);
  if (limit < 2) {
    const names = TIERS.filter((t) => caps[t].locations > 1).map((t) => plans[t].name);
    return { ok: false, message: `Extra locations are part of ${names.join(" and ") || "a higher plan"}. Change plan in Billing to add one.` };
  }
  const { count } = await supabase.from("provider_locations").select("id", { count: "exact", head: true }).eq("provider_id", providerId);
  if ((count ?? 0) >= limit - 1) return { ok: false, message: `Your plan covers ${limit} places in all, your main base included. Remove one to add another.` };

  const suburb = String(fd.get("suburb") ?? "").trim();
  const state = String(fd.get("state") ?? "").trim();
  const postcode = String(fd.get("postcode") ?? "").trim();
  if (!suburb) return { ok: false, message: "Pick the town from the list as you type." };
  // By town and state first: a postcode alone resolves to whichever suburb
  // shares it first (3350 is Alfredton before Ballarat).
  const at = (state && (await resolveLocation(supabase, `${suburb} ${state}`))) || (await resolveLocation(supabase, `${suburb} ${postcode || state}`.trim()));
  if (!at) return { ok: false, message: "We couldn't find that town. Pick it from the list as you type." };
  const radius = Math.round(Number(fd.get("travel_radius_km") || 30));
  if (!Number.isFinite(radius) || radius < 0 || radius > 1000) return { ok: false, message: "Travel distance is a number of kilometres, up to 1000." };

  const { error } = await supabase.from("provider_locations").insert({
    provider_id: providerId,
    suburb: titleCase(suburb),
    state: (state || at.state).toUpperCase(),
    postcode: postcode || at.postcode,
    area_id: at.area_id,
    location: `SRID=4326;POINT(${at.long} ${at.lat})`,
    lat: at.lat,
    long: at.long,
    travel_radius_km: radius,
    sort_order: count ?? 0,
  });
  if (error) return { ok: false, message: "That didn't save. Try again in a minute." };
  refresh(provider.slug);
  return { ok: true, message: `Added. People searching near ${titleCase(suburb)} can find you now.` };
}

export async function removeLocation(id: string) {
  const { supabase, provider } = await requireProvider();
  const { error } = await supabase.from("provider_locations").delete().eq("id", id);
  if (error) throw new Error("That didn't remove. Try again.");
  refresh(provider.slug);
}

function refresh(slug: string | null | undefined) {
  revalidatePath("/dashboard/profile");
  if (slug) revalidatePath(profilePath(slug));
}
