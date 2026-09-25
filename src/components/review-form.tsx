"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { submitReview, type ReviewResult } from "@/app/review/actions";

const STAR = "M12 2.8l2.83 5.74 6.33.92-4.58 4.47 1.08 6.3L12 17.25l-5.66 2.98 1.08-6.3L2.84 9.46l6.33-.92z";
const WORDS = ["Poor", "Not great", "OK", "Good", "Excellent"];

/**
 * The review form (M5). The stars are five real radio buttons, so arrow keys
 * and screen readers work; the labels are what shows. With a follow-up token
 * the email comes from the enquiry, so it isn't asked for.
 */
export function ReviewForm({
  providerId,
  declaration,
  sent,
  confirmedLive,
  confirmedHeld,
  enquiryToken,
  defaultName = "",
}: {
  providerId: string;
  declaration: string;
  sent: string;
  confirmedLive: string;
  confirmedHeld: string;
  enquiryToken?: string;
  defaultName?: string;
}) {
  const [state, action, pending] = useActionState<ReviewResult, FormData>(submitReview, { ok: false, message: "" });
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  if (state.ok && state.done) {
    return (
      <p role="status" className="text-[15px] leading-[1.5] text-fg" data-review-done={state.done}>
        {state.done === "sent" ? sent : state.done === "live" ? confirmedLive : confirmedHeld}
      </p>
    );
  }
  const shown = hover || rating;
  return (
    <form action={action} className="flex flex-col gap-4" data-review-form>
      <input type="hidden" name="provider_id" value={providerId} />
      {enquiryToken && <input type="hidden" name="enquiry_token" value={enquiryToken} />}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-px w-px" />
      <fieldset>
        <legend className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.12em] text-subtle">Your rating</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} required checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" />
              <span className="sr-only">{n} {n === 1 ? "star" : "stars"}</span>
              <svg viewBox="0 0 24 24" aria-hidden className={`h-9 w-9 rounded-[6px] peer-focus-visible:outline-2 peer-focus-visible:outline-accent ${n <= shown ? "text-accent" : "text-border"}`}>
                <path d={STAR} fill="currentColor" />
              </svg>
            </label>
          ))}
          <span className="ml-2 text-[14px] text-muted" aria-hidden>{shown ? WORDS[shown - 1] : ""}</span>
        </div>
      </fieldset>
      <Field label="What was it like?">
        <textarea name="body" required minLength={20} maxLength={3000} rows={6} className={inputClass} />
      </Field>
      <Field label="Your name">
        <input name="name" required maxLength={60} defaultValue={defaultName} autoComplete="name" className={inputClass} />
      </Field>
      {!enquiryToken && (
        <Field label="Your email" hint={<span className="mt-1 block text-[13px] text-subtle">We send you a link to post the review. It never shows on the site.</span>}>
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
      )}
      <label className="flex items-start gap-2.5 text-[14px] leading-[1.45] text-fg">
        <input type="checkbox" name="declaration" required className="mt-1 accent-accent" />
        <span>{declaration}</span>
      </label>
      {state.message && <p role="alert" className="text-[14px] text-danger">{state.message}</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full text-[15px]">
        {pending ? "Sending" : "Send my review"}
      </Button>
    </form>
  );
}
