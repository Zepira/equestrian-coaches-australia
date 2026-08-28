import { Button, LinkButton } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { isMockPayments } from "@/lib/stripe";
import { startCheckout } from "@/app/dashboard/billing/actions";

export const metadata = { title: "For coaches" };

const tiers = [
  {
    name: "Standard",
    price: "$9.99",
    tier: "standard" as const,
    features: [
      "Full profile — bio, photo, location",
      "Discipline tags, qualifications & testimonials",
      "Found in discipline + location search",
    ],
  },
  {
    name: "Standard + Clinics",
    price: "$14.95",
    tier: "standard_plus_clinics" as const,
    features: [
      "Everything in Standard",
      "List clinics & events",
      "Riders following your discipline/area are notified",
    ],
    recommended: true,
  },
];

export default async function ForCoachesPage() {
  const supabase = await createClient();
  let isLoggedInCoach = false;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      isLoggedInCoach = data?.role === "coach";
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-fg sm:text-4xl">Be found by riders near you.</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          One flat monthly price, no gatekeeping by discipline or accreditation. Your listing,
          kept current by you.
        </p>
        {isMockPayments && (
          <p className="mx-auto mt-4 max-w-md rounded-md border border-border bg-accent-soft p-3 text-sm text-fg">
            Running on mock payments while the business/billing setup is confirmed — subscribing
            publishes your profile for real, no card is charged yet.
          </p>
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tiers.map((tier) => (
          <div
            key={tier.tier}
            className={`flex flex-col rounded-xl border p-6 ${
              tier.recommended ? "border-accent bg-accent-soft" : "border-border bg-surface"
            }`}
          >
            {tier.recommended && (
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
                Recommended
              </div>
            )}
            <div className="text-lg font-semibold text-fg">{tier.name}</div>
            <div className="mt-1 text-3xl font-bold text-fg">
              {tier.price}
              <span className="text-base font-normal text-muted"> / month AUD</span>
            </div>
            <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-fg">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {isLoggedInCoach ? (
              <form action={startCheckout.bind(null, tier.tier)} className="mt-6">
                <Button
                  type="submit"
                  variant={tier.recommended ? "primary" : "secondary"}
                  className="w-full"
                >
                  {isMockPayments ? "Subscribe (mock)" : "Subscribe"}
                </Button>
              </form>
            ) : (
              <LinkButton
                href={`/signup?role=coach&tier=${tier.tier}`}
                variant={tier.recommended ? "primary" : "secondary"}
                className="mt-6"
              >
                List your profile
              </LinkButton>
            )}
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        Prices shown exclude GST where applicable. Cancel anytime from your dashboard.
      </p>
    </div>
  );
}
