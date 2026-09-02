"use client";

import { useState, useTransition } from "react";
import { revealContactChannel } from "@/app/coaches/[slug]/actions";

type Channel = "phone" | "email";

const CHANNEL_CONFIG: Record<Channel, { icon: string; label: string; href: (value: string) => string }> = {
  phone: { icon: "📞", label: "Show phone number", href: (value) => `tel:${value}` },
  email: { icon: "✉️", label: "Show email", href: (value) => `mailto:${value}` },
};

/**
 * A contact channel that starts as a "Show phone number"/"Show email"
 * button, not the raw value — per the spec, a coach's phone/email must
 * never be printed straight into the page ("it's invisible to us"; a
 * scraper reading the HTML gets it for free and there's no signal of
 * intent to log). Two reveal paths:
 * - Real coach (`coachId` given, no `initialValue`): the value was never
 *   sent to the browser at all — the click calls revealContactChannel(),
 *   which re-reads it server-side and logs a contact_reveal event.
 * - Mock/placeholder coach (`initialValue` given instead): the value is
 *   already-fake demo data with nothing to protect, so it's revealed
 *   client-side with no server round-trip and no logging.
 */
export function ContactRevealButton({
  channel,
  coachId,
  initialValue,
}: {
  channel: Channel;
  coachId?: string | null;
  initialValue?: string | null;
}) {
  // Starts null even on the mock/placeholder path — a click is still
  // required there too, just without a server round-trip (see the class
  // doc comment above). Seeding state from initialValue here would skip
  // the button entirely and show the value immediately, which doesn't
  // match how a real coach's reveal behaves.
  const [value, setValue] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [pending, startTransition] = useTransition();
  const config = CHANNEL_CONFIG[channel];

  if (unavailable) return null;

  if (value) {
    return (
      <a href={config.href(value)} className="font-medium text-accent hover:text-ink">
        {config.icon} {value}
      </a>
    );
  }

  function reveal() {
    if (initialValue) {
      setValue(initialValue);
      return;
    }
    if (!coachId) return;
    startTransition(async () => {
      const revealed = await revealContactChannel(coachId, channel);
      if (revealed) setValue(revealed);
      else setUnavailable(true);
    });
  }

  return (
    <button
      type="button"
      onClick={reveal}
      disabled={pending}
      className="font-medium text-accent hover:text-ink disabled:opacity-60"
    >
      {pending ? "…" : `${config.icon} ${config.label}`}
    </button>
  );
}
