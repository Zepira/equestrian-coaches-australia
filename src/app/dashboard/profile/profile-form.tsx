"use client";

import { Button } from "@/components/ui/button";
import { saveProfile, uploadPhoto, deletePhoto, addTestimonial, deleteTestimonial } from "./actions";

type Term = { id: string; slug: string; name: string; blurb?: string };
type Coach = {
  headline: string;
  bio: string;
  suburb: string;
  state: string;
  postcode: string;
  qualifications: string[];
} | null;
type Photo = { id: string; url: string; storage_path: string };
type Testimonial = { id: string; author_name: string; quote: string };

function TermCheckboxGroup({
  legend,
  hint,
  name,
  terms,
  selectedIds,
  configured,
}: {
  legend: string;
  hint?: string;
  name: string;
  terms: Term[];
  selectedIds: string[];
  configured: boolean;
}) {
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
              name={name}
              value={t.id}
              defaultChecked={selectedIds.includes(t.id)}
              className="accent-current"
            />
            {t.name}
          </label>
        ))}
      </div>
    </fieldset>
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
        <p className="rounded-md border border-border bg-accent-soft p-3 text-sm text-fg">
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
                  className="h-full w-full rounded-md object-cover"
                />
                <form action={deletePhoto.bind(null, photo.id, photo.storage_path)}>
                  <button
                    type="submit"
                    disabled={!configured}
                    aria-label="Remove photo"
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-fg text-xs font-bold text-bg"
                  >
                    ×
                  </button>
                </form>
              </div>
            ))}
            <div className="h-20 w-20 rounded-md bg-accent-soft" aria-hidden />
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
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Bio</span>
          <textarea
            name="bio"
            rows={5}
            defaultValue={coach?.bio}
            disabled={!configured}
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
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
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">State</span>
            <input
              name="state"
              type="text"
              defaultValue={coach?.state}
              disabled={!configured}
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Postcode</span>
            <input
              name="postcode"
              type="text"
              defaultValue={coach?.postcode}
              disabled={!configured}
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
            />
          </label>
        </div>

        <TermCheckboxGroup
          legend="Disciplines you teach"
          hint="The first one you tick leads your profile title and card — reordering comes later."
          name="discipline"
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
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted disabled:opacity-60"
          />
        </label>

        <Button type="submit" disabled={!configured} className="self-start">
          Save profile
        </Button>
      </form>

      <form action={uploadPhoto} className="flex flex-wrap items-end gap-3 border-t border-border pt-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Add a photo</span>
          <input
            name="photo"
            type="file"
            accept="image/*"
            disabled={!configured}
            className="text-sm text-fg disabled:opacity-60"
          />
        </label>
        <Button type="submit" variant="secondary" disabled={!configured}>
          Upload
        </Button>
      </form>

      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-fg">Testimonials</h2>
        <div className="mt-3 flex flex-col gap-3">
          {testimonials.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4">
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
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
            />
          </label>
          <label className="block flex-[2]">
            <span className="mb-1 block text-sm font-medium text-fg">Quote</span>
            <input
              name="quote"
              type="text"
              disabled={!configured}
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg disabled:opacity-60"
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
