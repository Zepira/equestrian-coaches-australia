"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TermCheckboxGroup, type Term } from "@/components/term-checkbox-group";
import { saveProfile, deletePhoto, addTestimonial, deleteTestimonial } from "./actions";
import { PhotoUploadForm } from "./photo-upload-form";

type Coach = {
  headline: string;
  bio: string;
  suburb: string;
  state: string;
  postcode: string;
  qualifications: string[];
  contact_email: string;
  contact_phone: string;
  facebook_url: string;
  show_contact_email: boolean;
  show_contact_phone: boolean;
  show_facebook: boolean;
  show_contact_form: boolean;
} | null;
type Photo = { id: string; url: string; storage_path: string };
type Testimonial = { id: string; author_name: string; quote: string };

// saveProfile assigns sort_order from formData.getAll("discipline")'s array
// index — the lowest is the coach's primary, used in page titles (spec:
// "coach reorders by dragging"). Checkboxes here are just membership
// toggles; the actual order lives in this component's state and is
// submitted via a run of hidden inputs rendered in that order, since a
// checkbox's position in the DOM never reflects the order it was checked
// in (FormData.getAll follows document order, not click order).
function DisciplinePicker({
  legend,
  hint,
  terms,
  selectedIds,
  configured,
}: {
  legend: string;
  hint?: string;
  terms: Term[];
  selectedIds: string[];
  configured: boolean;
}) {
  const [order, setOrder] = useState(() => selectedIds.filter((id) => terms.some((t) => t.id === id)));
  const [dragId, setDragId] = useState<string | null>(null);

  function toggle(id: string, checked: boolean) {
    setOrder((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function move(id: string, direction: -1 | 1) {
    setOrder((prev) => {
      const from = prev.indexOf(id);
      const to = from + direction;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setOrder((prev) => {
      const next = prev.filter((id) => id !== dragId);
      next.splice(next.indexOf(targetId), 0, dragId);
      return next;
    });
    setDragId(null);
  }

  return (
    <fieldset disabled={!configured}>
      <legend className="mb-1 text-sm font-medium text-fg">{legend}</legend>
      {hint && <p className="mb-2 text-sm text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {terms.map((t) => (
          <label
            key={t.id}
            className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-fg has-checked:border-accent has-checked:bg-accent-soft"
          >
            <input
              type="checkbox"
              checked={order.includes(t.id)}
              onChange={(e) => toggle(t.id, e.target.checked)}
              className="accent-current"
            />
            {t.name}
          </label>
        ))}
      </div>

      {order.length > 0 && (
        <ol className="mt-3 flex flex-col gap-1.5">
          {order.map((id, i) => {
            const term = terms.find((t) => t.id === id);
            if (!term) return null;
            return (
              <li
                key={id}
                draggable={configured}
                onDragStart={() => setDragId(id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(id)}
                className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3 py-1.5 text-sm text-fg"
              >
                <span aria-hidden className="cursor-grab text-muted">
                  ⠿
                </span>
                <span className="flex-1">
                  {term.name}
                  {i === 0 && <span className="ml-1.5 text-xs text-muted">(primary — leads your page title)</span>}
                </span>
                <button
                  type="button"
                  onClick={() => move(id, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${term.name} up`}
                  className="text-muted hover:text-fg disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(id, 1)}
                  disabled={i === order.length - 1}
                  aria-label={`Move ${term.name} down`}
                  className="text-muted hover:text-fg disabled:opacity-30"
                >
                  ↓
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {order.map((id) => (
        <input key={id} type="hidden" name="discipline" value={id} />
      ))}
    </fieldset>
  );
}

// One row per contact channel: a value field plus its own "show this on
// my public profile" toggle, so a coach can keep a phone number on file
// without publishing it (spec: "riders will get to choose which one to
// display — maybe they don't all want email enquiries").
function ContactChannelField({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  showName,
  defaultShow,
  configured,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  showName: string;
  defaultShow: boolean;
  configured: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-3">
      <label className="block flex-1">
        <span className="mb-1 block text-sm font-medium text-fg">{label}</span>
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={!configured}
          className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted disabled:opacity-60"
        />
      </label>
      <label className="flex items-center gap-2 pb-2.5 text-sm text-fg sm:pb-2.5">
        <input
          type="checkbox"
          name={showName}
          value="on"
          defaultChecked={defaultShow}
          disabled={!configured}
          className="accent-current"
        />
        Show on my profile
      </label>
    </div>
  );
}

export function ProfileForm({
  configured,
  coach,
  disciplines,
  skills,
  attributes,
  selectedTermIds,
  photos,
  testimonials,
}: {
  configured: boolean;
  coach: Coach;
  disciplines: Term[];
  skills: Term[];
  attributes: Term[];
  selectedTermIds: string[];
  photos: Photo[];
  testimonials: Testimonial[];
}) {
  return (
    <div className="flex flex-col gap-10">
      {!configured && (
        <p className="rounded-[var(--radius-control)] border border-border bg-accent-soft p-3 text-sm text-fg">
          Not connected to Supabase yet — this form is a preview until the project is set up
          (build plan, phase 2).
        </p>
      )}

      <form action={saveProfile} className="flex flex-col gap-6">
        <div>
          <span className="mb-2 block text-sm font-medium text-fg">Profile photos</span>
          <div className="flex flex-wrap gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative h-20 w-20">
                {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URLs, not worth next/image config yet */}
                <img
                  src={photo.url}
                  alt=""
                  className="h-full w-full rounded-[var(--radius-control)] object-cover"
                />
                {/* formAction, not a nested <form> — this button already lives
                    inside the outer <form action={saveProfile}>, and HTML
                    forbids a <form> inside a <form> (it silently breaks:
                    browsers hoist the inner one out, so the button ends up
                    submitting whichever form the DOM parser decided on,
                    unpredictable across browsers/devices). A submit button's
                    own formAction overrides the enclosing form's action for
                    just that button — the correct way to have two different
                    server actions in one <form>. */}
                <button
                  type="submit"
                  formAction={deletePhoto.bind(null, photo.id, photo.storage_path)}
                  disabled={!configured}
                  aria-label="Remove photo"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-fg text-xs font-bold text-bg"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="h-20 w-20 rounded-[var(--radius-control)] bg-accent-soft" aria-hidden />
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Headline</span>
          <input
            name="headline"
            type="text"
            defaultValue={coach?.headline}
            disabled={!configured}
            placeholder="e.g. Working equitation, from first flatwork to your first competition."
            className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Bio</span>
          <textarea
            name="bio"
            rows={5}
            defaultValue={coach?.bio}
            disabled={!configured}
            className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Suburb</span>
            <input
              name="suburb"
              type="text"
              defaultValue={coach?.suburb}
              disabled={!configured}
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">State</span>
            <input
              name="state"
              type="text"
              defaultValue={coach?.state}
              disabled={!configured}
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Postcode</span>
            <input
              name="postcode"
              type="text"
              defaultValue={coach?.postcode}
              disabled={!configured}
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
            />
          </label>
        </div>

        <DisciplinePicker
          legend="Disciplines you teach"
          hint="Tick every discipline you teach, then drag to put your primary one first — that's the one that leads your profile title and card."
          terms={disciplines}
          selectedIds={selectedTermIds}
          configured={configured}
        />

        <TermCheckboxGroup
          legend="Skills you coach"
          hint="What you fix — the searches that convert best. Pick a handful that are genuinely you."
          name="skill"
          terms={skills}
          selectedIds={selectedTermIds}
          configured={configured}
        />

        <TermCheckboxGroup
          legend="About your setup"
          hint="Practical facts riders filter on before they bother enquiring."
          name="attribute"
          terms={attributes}
          selectedIds={selectedTermIds}
          configured={configured}
        />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Qualifications</span>
          <textarea
            name="qualifications"
            rows={3}
            defaultValue={coach?.qualifications?.join("\n")}
            disabled={!configured}
            placeholder="One per line — e.g. EA Level 1 Coach"
            className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted disabled:opacity-60"
          />
        </label>

        <fieldset disabled={!configured} className="flex flex-col gap-4 border-t border-border pt-6">
          <div>
            <legend className="text-sm font-medium text-fg">Contact &amp; enquiries</legend>
            <p className="mt-1 text-sm text-muted">
              Pick how riders can reach you — turn any of these off if you&apos;d rather not get
              enquiries that way.
            </p>
          </div>
          <ContactChannelField
            label="Email"
            name="contact_email"
            type="email"
            placeholder="you@example.com"
            defaultValue={coach?.contact_email}
            showName="show_contact_email"
            defaultShow={coach?.show_contact_email ?? false}
            configured={configured}
          />
          <ContactChannelField
            label="Phone"
            name="contact_phone"
            type="tel"
            placeholder="04xx xxx xxx"
            defaultValue={coach?.contact_phone}
            showName="show_contact_phone"
            defaultShow={coach?.show_contact_phone ?? false}
            configured={configured}
          />
          <ContactChannelField
            label="Facebook page or profile"
            name="facebook_url"
            type="url"
            placeholder="https://facebook.com/yourpage"
            defaultValue={coach?.facebook_url}
            showName="show_facebook"
            defaultShow={coach?.show_facebook ?? false}
            configured={configured}
          />
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              name="show_contact_form"
              value="on"
              defaultChecked={coach?.show_contact_form ?? true}
              disabled={!configured}
              className="accent-current"
            />
            Show the in-app contact form (riders message you without seeing your email)
          </label>
        </fieldset>

        <Button type="submit" disabled={!configured} className="self-start">
          Save profile
        </Button>
      </form>

      <PhotoUploadForm configured={configured} />

      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-fg">Testimonials</h2>
        <div className="mt-3 flex flex-col gap-3">
          {testimonials.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 rounded-[var(--radius-tile)] border border-border bg-surface p-4">
              <div>
                <p className="text-fg">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-1 text-sm text-muted">— {t.author_name}</p>
              </div>
              <form action={deleteTestimonial.bind(null, t.id)}>
                <button type="submit" className="text-sm text-danger">
                  Remove
                </button>
              </form>
            </div>
          ))}
        </div>

        <form action={addTestimonial} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-sm font-medium text-fg">Rider name</span>
            <input
              name="author_name"
              type="text"
              disabled={!configured}
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
            />
          </label>
          <label className="block flex-[2]">
            <span className="mb-1 block text-sm font-medium text-fg">Quote</span>
            <input
              name="quote"
              type="text"
              disabled={!configured}
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
            />
          </label>
          <Button type="submit" variant="secondary" disabled={!configured}>
            Add
          </Button>
        </form>
      </section>
    </div>
  );
}
