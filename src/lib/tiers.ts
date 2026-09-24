/**
 * The three plans (CLAUDE.md "Two-sided marketplace, one-sided pricing").
 * Types, code defaults and the gating rules live here; the values a page
 * shows come from the `plans` and `plan_capabilities` settings through
 * getPlans() / getPlanCapabilities() in src/lib/settings.ts, which fall back
 * to the defaults below. Stripe price IDs are in src/lib/stripe.ts.
 *
 * No imports, so client components can use the types and gates.
 */
export type Tier = "listed" | "spotlight" | "clinic";
export const TIERS: Tier[] = ["listed", "spotlight", "clinic"];

export type PlanInfo = { name: string; monthly: string; yearly: string; tagline: string };
export type Plans = Record<Tier, PlanInfo>;

export const DEFAULT_PLANS: Plans = {
  listed: { name: "Listed", monthly: "$9.99", yearly: "$99", tagline: "For most coaches" },
  spotlight: { name: "Spotlight", monthly: "$24.95", yearly: "$249", tagline: "For coaches building a book" },
  clinic: { name: "Clinic", monthly: "$49.95", yearly: "$499", tagline: "For coaches who are already full" },
};

/** What a plan unlocks. `eventLimit` null = unlimited live events. */
export type PlanCapability = { eventLimit: number | null; video: boolean };
export type PlanCapabilities = Record<Tier, PlanCapability>;

export const DEFAULT_CAPABILITIES: PlanCapabilities = {
  listed: { eventLimit: 1, video: false },
  spotlight: { eventLimit: null, video: true },
  clinic: { eventLimit: null, video: true },
};

export function isTier(v: unknown): v is Tier {
  return v === "listed" || v === "spotlight" || v === "clinic";
}

/**
 * Subscription statuses that count as on a plan: a founding member whose
 * card is saved or who is in their free period is as subscribed as one
 * who is paying (the subscription_status enum, baseline migration).
 */
export const LIVE_PLAN_STATUSES = ["card_saved", "trialing", "active"] as const;
export function isLiveStatus(status: string | null | undefined) {
  return (LIVE_PLAN_STATUSES as readonly string[]).includes(status ?? "");
}

/** Any live paid plan may list events; how many is the plan's eventLimit. */
export function canListClinics(tier: string | null | undefined, status: string | null | undefined) {
  return isLiveStatus(status) && isTier(tier);
}
export function clinicLimit(tier: string | null | undefined, caps: PlanCapabilities): number {
  return isTier(tier) ? (caps[tier].eventLimit ?? Number.POSITIVE_INFINITY) : 0;
}
/** Intro video, where the plan includes it. */
export function hasVideo(tier: string | null | undefined, status: string | null | undefined, caps: PlanCapabilities) {
  return isLiveStatus(status) && isTier(tier) && caps[tier].video;
}
