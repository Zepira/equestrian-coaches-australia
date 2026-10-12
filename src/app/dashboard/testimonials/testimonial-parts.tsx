"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import type { Testimonial } from "@/lib/testimonials";
import {
  addTestimonial,
  deleteTestimonial,
  editTestimonial,
  moveTestimonial,
  pinTestimonial,
  setTestimonialShown,
  type TestimonialFormState,
} from "./actions";

const card = "rounded-[16px] border border-border bg-surface p-4 wide:p-5";
const small = "rounded-[var(--radius-pill)] border border-border px-3.5 py-2 text-[13px] font-medium text-fg hover:bg-shade";
const by = (t: Testimonial) => (t.authorPlace ? `${t.authorName}, ${t.authorPlace}` : t.authorName);

/** The quote, who it's from, and where it came from. */
function Quote({ t }: { t: Testimonial }) {
  return (
    <>
      <p className="whitespace-pre-line font-display text-[18px] leading-[1.35] text-fg">&ldquo;{t.quote}&rdquo;</p>
      <p className="mt-1.5 text-[13px] text-subtle">
        {by(t)} · {t.source === "request" ? "Sent through your link" : "Added by you"}
      </p>
    </>
  );
}

function QuoteFields({ t, maxLength, audience }: { t?: Testimonial; maxLength: number; audience: string }) {
  return (
    <>
      <Field label="Quote">
        <textarea name="quote" required maxLength={maxLength} rows={4} defaultValue={t?.quote ?? ""} className={`${inputClass} py-3 leading-[1.5]`} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${audience.charAt(0).toUpperCase()}${audience.slice(1)}'s name`}>
          <input name="author_name" required maxLength={80} defaultValue={t?.authorName ?? ""} placeholder="Megan" className={inputClass} />
        </Field>
        <Field label="Their town (optional)">
          <input name="author_place" maxLength={60} defaultValue={t?.authorPlace ?? ""} placeholder="Bendigo" className={inputClass} />
        </Field>
      </div>
    </>
  );
}

function Message({ state }: { state: TestimonialFormState }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`text-[13.5px] ${state.ok ? "text-fg" : "text-danger"}`}>
      {state.message}
    </p>
  );
}

/** One shown testimonial: order, pin, edit (their own), hide, delete. */
export function ShownTestimonial({ t, first, last, canPin, maxLength, audience }: { t: Testimonial; first: boolean; last: boolean; canPin: boolean; maxLength: number; audience: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<TestimonialFormState, FormData>(editTestimonial.bind(null, t.id), null);
  const pinned = t.pinned && canPin;
  return (
    <article className={`${card} ${pinned ? "border-accent" : ""}`} data-testimonial={t.id}>
      {pinned && <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.14em] text-accent">Pinned to the top</p>}
      {editing ? (
        <form action={action} className="flex flex-col gap-3">
          <QuoteFields t={t} maxLength={maxLength} audience={audience} />
          <Message state={state} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary">Save</Button>
            <button type="button" onClick={() => setEditing(false)} className={small}>Done</button>
          </div>
        </form>
      ) : (
        <>
          <Quote t={t} />
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <form action={moveTestimonial.bind(null, t.id, "up")}>
              <Button type="submit" variant="secondary" disabled={first} className="!px-3.5 !py-2 !text-[13px]" aria-label="Move up">↑</Button>
            </form>
            <form action={moveTestimonial.bind(null, t.id, "down")}>
              <Button type="submit" variant="secondary" disabled={last} className="!px-3.5 !py-2 !text-[13px]" aria-label="Move down">↓</Button>
            </form>
            {canPin && (
              <form action={pinTestimonial.bind(null, t.id, !t.pinned)}>
                <Button type="submit" variant="secondary" className="!px-3.5 !py-2 !text-[13px]">{t.pinned ? "Unpin" : "Pin to the top"}</Button>
              </form>
            )}
            {t.source === "added" && (
              <button type="button" onClick={() => setEditing(true)} className={small}>Edit</button>
            )}
            <form action={setTestimonialShown.bind(null, t.id, false)}>
              <Button type="submit" variant="secondary" className="!px-3.5 !py-2 !text-[13px]">Hide</Button>
            </form>
            <form action={deleteTestimonial.bind(null, t.id)} onSubmit={(e) => { if (!confirm("Delete this testimonial? This can't be undone.")) e.preventDefault(); }}>
              <Button type="submit" variant="danger-ghost" className="!text-[13px]">Delete</Button>
            </form>
          </div>
        </>
      )}
    </article>
  );
}

/** One waiting or hidden testimonial: show it, or delete it. */
export function OtherTestimonial({ t, waiting }: { t: Testimonial; waiting: boolean }) {
  return (
    <article className={card} data-testimonial={t.id}>
      <Quote t={t} />
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <form action={setTestimonialShown.bind(null, t.id, true)}>
          <Button type="submit" variant={waiting ? "primary" : "secondary"} className="!px-4 !py-2.5 !text-[14px]">Show on my profile</Button>
        </form>
        {waiting && (
          <form action={setTestimonialShown.bind(null, t.id, false)}>
            <Button type="submit" variant="secondary" className="!px-4 !py-2.5 !text-[14px]">Keep it hidden</Button>
          </form>
        )}
        <form action={deleteTestimonial.bind(null, t.id)} onSubmit={(e) => { if (!confirm("Delete this testimonial? This can't be undone.")) e.preventDefault(); }}>
          <Button type="submit" variant="danger-ghost" className="!text-[13px]">Delete</Button>
        </form>
      </div>
    </article>
  );
}

/** Type one in: a quote a client gave you, by message or in person. */
export function AddTestimonial({ maxLength, audience }: { maxLength: number; audience: string }) {
  const [state, action] = useActionState<TestimonialFormState, FormData>(addTestimonial, null);
  const form = useRef<HTMLFormElement>(null);
  // Clear the fields once one has been added, ready for the next.
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className={`${card} flex flex-col gap-3`}>
      <h2 className="font-display text-[22px] leading-none text-ink">Add one yourself</h2>
      <p className="text-[13px] leading-[1.5] text-subtle">
        A few kind words a {audience} sent you by message or said in person. Only add what they&rsquo;re happy for you to show, in their words.
      </p>
      <QuoteFields maxLength={maxLength} audience={audience} />
      <Message state={state} />
      <div>
        <Button type="submit" variant="secondary">Add to my profile</Button>
      </div>
    </form>
  );
}
