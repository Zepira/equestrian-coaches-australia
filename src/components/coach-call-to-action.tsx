import { LinkButton } from "@/components/ui/button";
import { PRICING_TIERS } from "@/lib/pricing";

/** Homepage closing CTA inviting coaches to list — self-contained, reads pricing from the shared source of truth. */
export function CoachCallToAction() {
  return (
    <section className="border-t border-border bg-bg">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-14 sm:flex-row sm:items-center sm:px-6 sm:py-16">
        <div className="max-w-xl">
          <h2 className="text-3xl leading-[1.05] text-ink sm:text-4xl">Coaching professionally?</h2>
          <p className="mt-3 text-lg leading-relaxed text-muted">
            List from <strong className="text-ink">{PRICING_TIERS.standard.price} a month</strong> — bio,
            photo, location, specialties, qualifications and testimonials.{" "}
            <strong className="text-ink">{PRICING_TIERS.standard_plus_clinics.price}</strong> adds your
            clinics and events.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <LinkButton href="/for-coaches" className="w-full sm:w-auto">
            List your coaching profile
          </LinkButton>
          <LinkButton href="/for-coaches" variant="secondary" className="w-full sm:w-auto">
            See pricing
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
