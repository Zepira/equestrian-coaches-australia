import { LinkButton } from "@/components/ui/button";
import { ContactForm } from "@/components/contact-form";
import { ContactRevealButton } from "@/components/contact-reveal-button";

type Contact = {
  email: string | null;
  phone: string | null;
  facebookUrl: string | null;
  showContactForm: boolean;
};

/**
 * The coach profile page's "Get in touch" block — whichever contact
 * channels the coach has toggled on, the in-app form if enabled, or a
 * fallback note when there's nothing to show at all. `hasContactInfo` used
 * to be computed twice in the page (once to decide whether to render the
 * channel row, again negated to decide whether to show the fallback note)
 * — collapsed to one boolean here.
 *
 * Phone/email are behind ContactRevealButton, not printed as plain links —
 * `coachId` is the real coach_profiles id (null for mock/placeholder
 * coaches), used to tell ContactRevealButton which reveal path to take.
 */
export function CoachContactSection({
  contact,
  contactId,
  coachId,
  coachName,
}: {
  contact: Contact;
  contactId: string | null;
  coachId: string | null;
  coachName: string;
}) {
  const hasContactInfo = Boolean(contact.email || contact.phone || contact.facebookUrl);
  const firstName = coachName.split(" ")[0];

  return (
    <section className="mt-10 rounded-[var(--radius-tile)] border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-fg">Get in touch</h2>

      {hasContactInfo && (
        <>
          <div className="mt-3 flex flex-wrap gap-4 text-[15px]">
            {contact.phone && (
              <ContactRevealButton
                channel="phone"
                coachId={coachId}
                initialValue={coachId ? undefined : contact.phone}
              />
            )}
            {contact.email && (
              <ContactRevealButton
                channel="email"
                coachId={coachId}
                initialValue={coachId ? undefined : contact.email}
              />
            )}
            {contact.facebookUrl && (
              <a
                href={contact.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent hover:text-ink"
              >
                Facebook →
              </a>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">
            When you get in touch, let {firstName} know you found them on Equestrian Coaches
            Australia — it helps them see the listing is working.
          </p>
        </>
      )}

      {contactId && contact.showContactForm ? (
        <div className="mt-5 border-t border-border pt-5">
          <ContactForm coachId={contactId} coachName={coachName} />
        </div>
      ) : (
        !hasContactInfo && (
          <p className="mt-1 text-sm text-muted">
            This coach hasn&apos;t published contact details yet — for now, try their listed
            disciplines and location and search around for them directly.
          </p>
        )
      )}

      <LinkButton href="/search" variant="secondary" className="mt-5">
        ← Back to search
      </LinkButton>
    </section>
  );
}
