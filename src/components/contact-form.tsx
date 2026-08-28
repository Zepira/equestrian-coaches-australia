"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { sendCoachEnquiry, type EnquiryResult } from "@/app/coaches/[slug]/actions";

export function ContactForm({ coachId, coachName }: { coachId: string; coachName?: string }) {
  const [state, formAction, pending] = useActionState<EnquiryResult | null, FormData>(
    sendCoachEnquiry,
    null
  );

  if (state?.ok) {
    return <p className="text-[15px] text-fg">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="coach_id" value={coachId} />
      {coachName && <input type="hidden" name="mock_coach_name" value={coachName} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Your name</span>
          <input
            name="rider_name"
            type="text"
            required
            className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Your email</span>
          <input
            name="rider_email"
            type="email"
            required
            className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-fg">Message</span>
        <textarea
          name="message"
          rows={4}
          required
          placeholder="Tell them what you're after — discipline, experience level, when you're free."
          className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted"
        />
      </label>
      {state && !state.ok && <p className="text-sm text-danger">{state.message}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Sending…" : "Send enquiry"}
      </Button>
    </form>
  );
}
