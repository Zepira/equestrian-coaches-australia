"use client";

import { useState, useTransition } from "react";
import { revealPhone } from "@/app/coaches/[slug]/actions";

/**
 * Click-to-reveal phone (canvas: "Show phone number"). The number is never
 * in the page HTML — it's fetched on click by a server action that also
 * logs a `reveal` event for the coach's dashboard. Renders nothing when
 * the coach hasn't switched the phone channel on.
 */
export function PhoneReveal({
  contactId,
  hasPhone,
  className = "",
}: {
  contactId: string;
  hasPhone: boolean;
  className?: string;
}) {
  const [phone, setPhone] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  if (!hasPhone) return null;

  const base = `inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-ink bg-transparent text-[15px] font-medium text-ink transition-colors duration-200 disabled:opacity-60 ${className}`;

  if (phone) {
    return (
      <a href={`tel:${phone.replace(/\s+/g, "")}`} className={base} data-revealed="true">
        {phone}
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await revealPhone(contactId);
          if (r.phone) setPhone(r.phone);
          else setFailed(true);
        })
      }
      className={base}
    >
      {failed ? "Number not available" : pending ? "…" : "Show phone number"}
    </button>
  );
}
