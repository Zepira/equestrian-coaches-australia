"use client";

import { useActionState, useState } from "react";
import { sendCoachEnquiry, type EnquiryResult, type EnquiryWant } from "@/app/coaches/[slug]/actions";

const WANTS: { value: EnquiryWant; label: string }[] = [
  { value: "regular", label: "Regular lessons" },
  { value: "one_off", label: "One-off" },
  { value: "clinic", label: "Clinic" },
];

/**
 * The enquiry form (canvas: "Message Isabella") — name, email or mobile,
 * what they want (three chips, single choice), message, "Send enquiry",
 * and the reassurance line. Shared by the desktop aside and the phone
 * bottom sheet. Success replaces the form in place.
 */
export function ContactForm({
  coachId,
  coachName,
  firstName,
  onSent,
  defaultWant = "regular",
}: {
  coachId: string;
  coachName?: string;
  firstName: string;
  onSent?: () => void;
  defaultWant?: EnquiryWant;
}) {
  const [state, formAction, pending] = useActionState<EnquiryResult | null, FormData>(sendCoachEnquiry, null);
  const [want, setWant] = useState<EnquiryWant>(defaultWant);

  if (state?.ok) {
    if (onSent) onSent();
    return (
      <p className="rounded-[12px] bg-shade p-4 text-[15px] leading-[1.5] text-fg" role="status">
        {state.message}
      </p>
    );
  }

  const input =
    "w-full rounded-[12px] border border-border bg-white px-3.5 py-3.5 text-[16px] text-fg placeholder:text-subtle focus:border-accent focus:outline-none wide:py-[13px] wide:text-[15px]";

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      <input type="hidden" name="coach_id" value={coachId} />
      <input type="hidden" name="want" value={want} />
      {coachName && <input type="hidden" name="mock_coach_name" value={coachName} />}
      <label className="block">
        <span className="sr-only">Your name</span>
        <input name="rider_name" type="text" required placeholder="Your name" autoComplete="name" className={input} />
      </label>
      <label className="block">
        <span className="sr-only">Email or mobile</span>
        <input name="rider_contact" type="text" required placeholder="Email or mobile" autoComplete="email" className={input} />
      </label>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="What are you after?">
        {WANTS.map((w) => {
          const on = w.value === want;
          return (
            <button
              key={w.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setWant(w.value)}
              className={`rounded-[var(--radius-pill)] border px-3 py-[7px] text-[13px] font-medium transition-colors duration-200 ${on ? "border-accent text-accent" : "border-border text-fg"}`}
            >
              {w.label}
            </button>
          );
        })}
      </div>
      <label className="block">
        <span className="sr-only">Message</span>
        <textarea
          name="message"
          required
          placeholder="A line about you and your horse, and what you'd like help with"
          className={`${input} h-[110px] resize-none leading-[1.4] wide:h-[120px]`}
        />
      </label>
      {state && !state.ok && (
        <p className="text-sm text-danger" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-[54px] rounded-[var(--radius-pill)] bg-accent text-[16px] font-semibold text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover disabled:opacity-60 wide:h-[52px] wide:text-[15px]"
      >
        {pending ? "Sending…" : "Send enquiry"}
      </button>
      <p className="text-center text-[12px] text-subtle">Goes straight to {firstName}. We never share your details.</p>
    </form>
  );
}
