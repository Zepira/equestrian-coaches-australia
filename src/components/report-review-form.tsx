"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { reportReview, type ReviewResult } from "@/app/review/actions";

/** The "Report this review" form (M5). */
export function ReportReviewForm({ reviewId, reasons }: { reviewId: string; reasons: [string, string][] }) {
  const [state, action, pending] = useActionState<ReviewResult, FormData>(reportReview, { ok: false, message: "" });
  if (state.ok) return <p role="status" className="text-[15px] leading-[1.5] text-fg">{state.message}</p>;
  return (
    <form action={action} className="flex flex-col gap-4" data-report-form>
      <input type="hidden" name="review_id" value={reviewId} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-px w-px" />
      <Field label="Which rule does it break?">
        <select name="reason" required defaultValue="" className={inputClass}>
          <option value="" disabled>Choose one</option>
          {reasons.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </Field>
      <Field label="Anything we should know (optional)">
        <textarea name="detail" rows={4} maxLength={1000} className={inputClass} />
      </Field>
      <Field label="Your email (optional)" hint={<span className="mt-1 block text-[13px] text-subtle">Only if you&rsquo;d like us to be able to ask you about it.</span>}>
        <input name="email" type="email" autoComplete="email" className={inputClass} />
      </Field>
      {state.message && <p role="alert" className="text-[14px] text-danger">{state.message}</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full text-[15px]">{pending ? "Sending" : "Send the report"}</Button>
    </form>
  );
}
