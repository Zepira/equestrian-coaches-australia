import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ensureProvider, type ProviderRow } from "@/lib/supabase/queries";
import { isLiveStatus, isTier, type Plans, type Tier } from "@/lib/tiers";
import { getPlans } from "@/lib/settings";
import { getProfessions } from "@/lib/cms/read";
import { FALLBACK_PROFESSIONS, type Profession } from "@/lib/professions";

/**
 * Everything the dashboard shell needs on every /dashboard/* render: the
 * provider this user edits (created if an older account has none), their
 * name, plan (from subscriptions), and the new-enquiry count for the tab
 * badge. Pages fetch their own detail on top of this.
 *
 * `providerId` is the profile's own id, not the user's: every provider
 * table keys on it (The Site as a CMS §04 D).
 */
export type DashboardContext = {
  supabase: SupabaseClient;
  userId: string;
  providerId: string;
  name: string;
  firstName: string;
  slug: string;
  tier: Tier | null;
  status: string;
  planName: string;
  planLine: string;
  /** Every plan's name, prices and tagline, from settings. */
  plans: Plans;
  /** The provider's professions, primary first (the dashboard's words and its per-section numbers). */
  professions: Profession[];
  newEnquiries: number;
  provider: ProviderRow;
};

export async function loadDashboard(): Promise<DashboardContext | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
  const name = profile?.name ?? "Coach";
  const provider = await ensureProvider(supabase, user.id, name);
  const [{ count }, { data: sub }, plans, { data: professionRows }, all] = await Promise.all([
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("provider_id", provider.id).eq("status", "new"),
    supabase.from("subscriptions").select("tier, status").eq("provider_id", provider.id).maybeSingle(),
    getPlans(),
    supabase.from("provider_terms").select("sort_order, terms!inner(slug, kind)").eq("provider_id", provider.id).eq("terms.kind", "profession").order("sort_order"),
    getProfessions(),
  ]);
  const professions = (professionRows ?? [])
    .map((r) => all.find((p) => p.slug === (r as unknown as { terms: { slug: string } }).terms.slug))
    .filter((p): p is Profession => Boolean(p));
  if (professions.length === 0) professions.push(all.find((p) => p.slug === "coaches") ?? FALLBACK_PROFESSIONS[0]);

  const tierRaw: unknown = sub?.tier;
  const tier: Tier | null = isTier(tierRaw) ? tierRaw : null;
  const status = String(sub?.status ?? "inactive");
  const planName = tier ? plans[tier].name : "No plan yet";
  const planLine = tier
    ? isLiveStatus(status)
      ? `${plans[tier].monthly} a month${provider.cohort === "founding" ? " · founding price locked in" : ""}.`
      : status === "past_due"
        ? "Payment past due. Update your card in Billing."
        : "Subscription cancelled. Your listing is unpublished."
    : "Choose a plan to publish your profile.";

  return {
    supabase,
    userId: user.id,
    providerId: provider.id,
    name: provider.name || name,
    firstName: (provider.name || name).split(" ")[0],
    slug: provider.slug,
    tier,
    status,
    planName,
    planLine,
    plans,
    professions,
    newEnquiries: count ?? 0,
    provider,
  };
}
