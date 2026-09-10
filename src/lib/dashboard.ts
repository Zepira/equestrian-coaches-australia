import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ensureCoachProfile } from "@/lib/supabase/queries";
import { isTier, TIER_META, type Tier } from "@/lib/tiers";

/**
 * Everything the dashboard shell needs on every /dashboard/* render: the
 * coach row (created lazily), their name, plan, and the new-enquiry count
 * for the tab badge. Pages fetch their own detail on top of this.
 */
export type DashboardContext = {
  supabase: SupabaseClient;
  userId: string;
  name: string;
  firstName: string;
  slug: string;
  tier: Tier | null;
  status: string;
  planName: string;
  planLine: string;
  newEnquiries: number;
  coach: Record<string, unknown>;
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
  const coach = await ensureCoachProfile(supabase, user.id, name);
  const { count } = await supabase
    .from("enquiries")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", user.id)
    .eq("status", "new");

  const tierRaw: unknown = coach.subscription_tier;
  const tier: Tier | null = isTier(tierRaw) ? tierRaw : null;
  const status = String(coach.subscription_status ?? "inactive");
  const planName = tier ? TIER_META[tier].name : "No plan yet";
  const planLine = tier
    ? status === "active"
      ? `${TIER_META[tier].monthly} a month · founding price locked in.`
      : status === "past_due"
        ? "Payment past due — update your card in Billing."
        : "Subscription cancelled — your listing is unpublished."
    : "Choose a plan to publish your profile.";

  return {
    supabase,
    userId: user.id,
    name,
    firstName: name.split(" ")[0],
    slug: String(coach.slug),
    tier,
    status,
    planName,
    planLine,
    newEnquiries: count ?? 0,
    coach: coach as Record<string, unknown>,
  };
}
