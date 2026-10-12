"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { LegalText } from "@/components/legal-text";
import { submitTestimonial, type TestimonialResult } from "@/app/testimonial/actions";

type Words = {
  quoteLabel: string;
  quoteHint: string;
  nameLabel: string;
  nameHint: string;
  placeLabel: string;
  placeHint: string;
  consent: string;
  button: string;
  sent: string;
};

/** The form on /testimonial/<slug>: the words, a name and town, and consent to show them. */
export function TestimonialForm({ slug, words, notice, maxLength }: { slug: string; words: Words; notice: string; maxLength: number }) {
  const [state, action] = useActionState<TestimonialResult, FormData>(submitTestimonial, { ok: false, message: "" });
  if (state.sent) {
    return (
      <p role="status" className="text-[15px] leading-[1.55] text-fg" data-testimonial-sent>
        {words.sent}
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-px w-px" />
      <Field label={words.quoteLabel} hint={<span className="mt-1 block text-[13px] text-subtle">{words.quoteHint}</span>}>
        <textarea name="quote" required minLength={20} maxLength={maxLength} rows={6} className={`${inputClass} min-h-[150px] py-3 leading-[1.5]`} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={words.nameLabel} hint={<span className="mt-1 block text-[13px] text-subtle">{words.nameHint}</span>}>
          <input name="name" required maxLength={80} autoComplete="given-name" className={inputClass} />
        </Field>
        <Field label={words.placeLabel} hint={<span className="mt-1 block text-[13px] text-subtle">{words.placeHint}</span>}>
          <input name="place" maxLength={60} autoComplete="address-level2" className={inputClass} />
        </Field>
      </div>
      <label className="flex items-start gap-2.5 text-[14px] leading-[1.45] text-fg">
        <input type="checkbox" name="consent" required className="mt-1 accent-accent" />
        <span>{words.consent}</span>
      </label>
      {state.message && (
        <p role="alert" className="text-[14px] text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" className="h-12 w-full text-[15px]">
        {words.button}
      </Button>
      <p className="text-[12.5px] leading-[1.5] text-subtle">
        <LegalText text={notice} />
      </p>
    </form>
  );
}
