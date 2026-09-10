"use client";

import { useState } from "react";
import { saveProfile, addTestimonial, deleteTestimonial } from "./actions";
import { MediaUploadForm } from "./media-upload-form";
import { LocationAutocomplete } from "@/components/location-autocomplete";

type Term = { id: string; slug: string; name: string; blurb?: string };
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
  subscription_status: string;
  subscription_tier: string | null;
  video_url: string | null;
  travel_radius_km: number | null;
  years_coaching: number | null;
} | null;
type Photo = { id: string; url: string; storage_path: string };
type Testimonial = { id: string; author_name: string; quote: string };

const input =
  "w-full rounded-[12px] border border-border bg-surface px-3.5 py-[13px] text-[15px] text-fg placeholder:text-subtle focus:border-accent focus:outline-none disabled:opacity-60 wide:px-4 wide:py-3.5 wide:text-[16px]";
const label = "mb-1.5 block text-[12px] font-medium uppercase tracking-[0.12em] text-subtle";
const chipOn = "border-accent bg-accent/8 text-accent";
const chipOff = "border-border bg-surface text-muted";

/** Chip-style multi-select (canvas: discipline chips). */
function TermChips({ legend, hint, name, terms, selectedIds, configured }: { legend: string; hint?: string; name: string; terms: Term[]; selectedIds: string[]; configured: boolean }) {
  return (
    <fieldset disabled={!configured}>
      <legend className={label}>
        {legend}
        {hint && <span className="ml-1 normal-case tracking-normal text-accent">· {hint}</span>}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {terms.map((t) => (
          <label key={t.id} className={`cursor-pointer rounded-[var(--radius-pill)] border px-3 py-[7px] text-[13px] font-medium transition-colors duration-200 has-checked:border-accent has-checked:bg-accent/8 has-checked:text-accent wide:px-3.5 wide:py-2 wide:text-[14px] ${chipOff}`}>
            <input type="checkbox" name={name} value={t.id} defaultChecked={selectedIds.includes(t.id)} className="sr-only" />
            {t.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Discipline chips + the ordered list beneath: saveProfile assigns
 * sort_order from the hidden inputs' order, so the first discipline leads
 * the page title (drag or ↑/↓ to reorder — see Phase 9f in CLAUDE.md).
 */
function DisciplinePicker({ terms, selectedIds, configured }: { terms: Term[]; selectedIds: string[]; configured: boolean }) {
  const [order, setOrder] = useState(() => selectedIds.filter((id) => terms.some((t) => t.id === id)));
  const [dragId, setDragId] = useState<string | null>(null);
  const toggle = (id: string) => setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const move = (id: string, dir: -1 | 1) =>
    setOrder((prev) => {
      const from = prev.indexOf(id);
      const to = from + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setOrder((prev) => {
      const next = prev.filter((id) => id !== dragId);
      next.splice(next.indexOf(targetId), 0, dragId);
      return next;
    });
    setDragId(null);
  };

  return (
    <fieldset disabled={!configured}>
      <legend className={label}>
        Disciplines <span className="normal-case tracking-normal text-accent">· first one leads your page title</span>
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {terms.map((t) => {
          const on = order.includes(t.id);
          return (
            <button key={t.id} type="button" aria-pressed={on} onClick={() => toggle(t.id)} className={`rounded-[var(--radius-pill)] border px-3 py-[7px] text-[13px] font-medium transition-colors duration-200 wide:px-3.5 wide:py-2 wide:text-[14px] ${on ? chipOn : chipOff}`}>
              {t.name}
            </button>
          );
        })}
      </div>
      {order.length > 1 && (
        <ol className="mt-3 flex flex-col gap-1.5">
          {order.map((id, i) => {
            const term = terms.find((t) => t.id === id);
            if (!term) return null;
            return (
              <li key={id} draggable={configured} onDragStart={() => setDragId(id)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(id)} className="flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-1.5 text-[14px] text-fg">
                <span aria-hidden className="cursor-grab text-subtle">⠿</span>
                <span className="flex-1">
                  {term.name}
                  {i === 0 && <span className="ml-1.5 text-[12px] text-subtle">(primary)</span>}
                </span>
                <button type="button" onClick={() => move(id, -1)} disabled={i === 0} aria-label={`Move ${term.name} up`} className="text-subtle hover:text-fg disabled:opacity-30">↑</button>
                <button type="button" onClick={() => move(id, 1)} disabled={i === order.length - 1} aria-label={`Move ${term.name} down`} className="text-subtle hover:text-fg disabled:opacity-30">↓</button>
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

/** A native checkbox styled as the canvas's 44×26 switch. */
function Switch({ name, defaultChecked, disabled, label: text }: { name: string; defaultChecked: boolean; disabled: boolean; label: string }) {
  return (
    <label className="relative inline-flex h-[26px] w-11 shrink-0 cursor-pointer items-center">
      <input type="checkbox" name={name} value="on" defaultChecked={defaultChecked} disabled={disabled} className="peer sr-only" aria-label={text} />
      <span aria-hidden className="absolute inset-0 rounded-[var(--radius-pill)] bg-[#d9cdb6] transition-colors duration-[250ms] peer-checked:bg-ink" />
      <span aria-hidden className="absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-surface transition-[left] duration-[250ms] peer-checked:left-[21px]" />
    </label>
  );
}

function ContactRow({ label: text, value, name, showName, defaultShow, configured, type = "text", placeholder }: { label: string; value?: string; name: string; showName: string; defaultShow: boolean; configured: boolean; type?: string; placeholder?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-shade py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-medium text-fg wide:text-[15px]">{text}</div>
        <input name={name} type={type} defaultValue={value} placeholder={placeholder} disabled={!configured} className="mt-0.5 w-full bg-transparent text-[13px] text-subtle placeholder:text-subtle/70 focus:text-fg focus:outline-none wide:text-[13.5px]" />
      </div>
      <Switch name={showName} defaultChecked={defaultShow} disabled={!configured} label={`Show ${text.toLowerCase()} on my profile`} />
    </div>
  );
}

/**
 * Profile editor (canvas: Dashboards › Profile): sticky photo left with
 * "Change photo", then headline, bio, discipline chips, Based in / Travels
 * up to, the "Contact riders see" switches, Discard / Save — plus the
 * skills, setup, qualifications, years and testimonials that sit further
 * down the same scroll.
 */
export function ProfileForm({ configured, coach, disciplines, skills, attributes, selectedTermIds, photos, testimonials, coachSlug }: { configured: boolean; coach: Coach; disciplines: Term[]; skills: Term[]; attributes: Term[]; selectedTermIds: string[]; photos: Photo[]; testimonials: Testimonial[]; coachSlug?: string | null }) {
  const [suburb, setSuburb] = useState(coach?.suburb ?? "");
  const [state, setState] = useState(coach?.state ?? "");
  const [postcode, setPostcode] = useState(coach?.postcode ?? "");
  const videoActive = coach?.subscription_status === "active" && (coach?.subscription_tier === "spotlight" || coach?.subscription_tier === "clinic");

  return (
    <div className="fade-in" style={{ animationDuration: "0.5s" }}>
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[40px] leading-none -tracking-[0.02em] text-ink wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.025em]">Your profile</h1>
        {coachSlug && (
          <a href={`/coaches/${coachSlug}`} className="shrink-0 text-[14px] font-medium text-accent wide:text-[15px]">
            <span className="wide:hidden">Preview →</span>
            <span className="hidden wide:inline">Preview as a rider →</span>
          </a>
        )}
      </div>
      {!configured && <p className="mt-4 rounded-[12px] border border-border bg-accent-soft p-3 text-[14px] text-fg">Not connected to Supabase yet — this form is a preview until the project is set up.</p>}

      <div className="mt-[18px] wide:mt-7 wide:grid wide:grid-cols-[260px_1fr] wide:items-start wide:gap-10">
        <div className="wide:sticky wide:top-[108px]">
          <MediaUploadForm configured={configured} photos={photos} videoUrl={coach?.video_url ?? null} videoActive={videoActive} />
        </div>

        <div className="mt-[22px] flex flex-col gap-3.5 wide:mt-0 wide:gap-4">
          <form action={saveProfile} className="flex flex-col gap-3.5 wide:gap-4" id="profile-form">
            <label className="block" id="headline">
              <span className={label}>Headline</span>
              <input name="headline" type="text" defaultValue={coach?.headline} disabled={!configured} placeholder="e.g. Dressage from first flatwork through to competition tests." className={input} />
            </label>
            <label className="block" id="bio">
              <span className={label}>Bio</span>
              <textarea name="bio" defaultValue={coach?.bio} disabled={!configured} className={`${input} h-[130px] resize-none leading-[1.45] wide:h-[140px] wide:leading-[1.5]`} />
            </label>
            <div id="disciplines">
              <DisciplinePicker terms={disciplines} selectedIds={selectedTermIds} configured={configured} />
            </div>
            <div className="grid grid-cols-2 gap-2.5 wide:gap-3" id="location">
              <label className="block">
                <span className={label}>Based in</span>
                <LocationAutocomplete
                  value={[suburb, state, postcode].filter(Boolean).join(" ")}
                  onChange={(v) => {
                    // free text until a suggestion is picked: keep the suburb
                    // as typed, leave state/postcode as they were
                    const parts = v.trim().split(/\s+/);
                    const st = parts.find((p) => /^(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)$/i.test(p));
                    const pc = parts.find((p) => /^\d{4}$/.test(p));
                    setSuburb(parts.filter((p) => p !== st && p !== pc).join(" "));
                    if (st) setState(st.toUpperCase());
                    if (pc) setPostcode(pc);
                  }}
                  onSelect={(s) => {
                    setSuburb(s.suburb);
                    setState(s.state);
                    setPostcode(s.postcode);
                  }}
                  placeholder="Suburb VIC 3550"
                  disabled={!configured}
                  inputClassName={input}
                />
                <input type="hidden" name="suburb" value={suburb} />
                <input type="hidden" name="state" value={state} />
                <input type="hidden" name="postcode" value={postcode} />
              </label>
              <label className="block">
                <span className={label}>Travels up to</span>
                <span className="relative block">
                  <input name="travel_radius_km" type="number" min={0} max={1000} defaultValue={coach?.travel_radius_km ?? ""} disabled={!configured} placeholder="60" className={`${input} pr-12`} />
                  <span aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-subtle">km</span>
                </span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2.5 wide:gap-3">
              <label className="block">
                <span className={label}>Years coaching</span>
                <input name="years_coaching" type="number" min={0} max={80} defaultValue={coach?.years_coaching ?? ""} disabled={!configured} placeholder="7" className={input} />
              </label>
            </div>

            <TermChips legend="Skills" hint="what you help riders fix" name="skill" terms={skills} selectedIds={selectedTermIds} configured={configured} />
            <TermChips legend="Setup" hint="what you offer" name="attribute" terms={attributes} selectedIds={selectedTermIds} configured={configured} />

            <label className="block">
              <span className={label}>Qualifications <span className="normal-case tracking-normal text-subtle">· one per line, shown as supplied by you</span></span>
              <textarea name="qualifications" defaultValue={coach?.qualifications?.join("\n")} disabled={!configured} placeholder={"EA Level 1 Coach (Dressage)\nWorking with Children Check · First aid current"} className={`${input} h-[96px] resize-none leading-[1.45]`} />
            </label>

            <div className="rounded-[14px] border border-border bg-surface px-4 py-3.5 wide:px-5 wide:py-4" id="contact">
              <span className={label}>Contact riders see</span>
              <div className="flex items-center justify-between gap-3 border-b border-shade py-3">
                <div>
                  <div className="text-[14.5px] font-medium text-fg wide:text-[15px]">Enquiry form</div>
                  <div className="text-[13px] text-subtle wide:text-[13.5px]">Riders message you through ECA</div>
                </div>
                <Switch name="show_contact_form" defaultChecked={coach?.show_contact_form ?? true} disabled={!configured} label="Show the enquiry form on my profile" />
              </div>
              <ContactRow label="Phone (click to reveal)" name="contact_phone" type="tel" placeholder="04xx xxx xxx" value={coach?.contact_phone} showName="show_contact_phone" defaultShow={coach?.show_contact_phone ?? false} configured={configured} />
              <ContactRow label="Email" name="contact_email" type="email" placeholder="you@example.com" value={coach?.contact_email} showName="show_contact_email" defaultShow={coach?.show_contact_email ?? false} configured={configured} />
              <ContactRow label="Facebook page" name="facebook_url" type="url" placeholder="facebook.com/yourpage" value={coach?.facebook_url} showName="show_facebook" defaultShow={coach?.show_facebook ?? false} configured={configured} />
            </div>

            <div className="flex gap-2.5 wide:justify-end">
              <button type="reset" disabled={!configured} className="hidden h-[50px] rounded-[var(--radius-pill)] border border-border px-5 text-[15px] font-medium text-muted wide:block">Discard</button>
              <button type="submit" disabled={!configured} className="h-[54px] w-full rounded-[var(--radius-pill)] bg-accent text-[16px] font-semibold text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover disabled:opacity-60 wide:h-[50px] wide:w-auto wide:px-[26px] wide:text-[15px]">
                Save changes
              </button>
            </div>
          </form>

          <section className="mt-6 rounded-[16px] border border-border bg-surface p-[18px] wide:p-6" id="testimonials">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[22px] leading-none text-ink wide:text-[24px]">Testimonials</h2>
              <span className="text-[13px] text-subtle">{testimonials.length} of 3 for a complete profile</span>
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              {testimonials.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 rounded-[12px] bg-shade p-3.5">
                  <div>
                    <p className="font-display text-[17px] leading-[1.3] text-fg">&ldquo;{t.quote}&rdquo;</p>
                    <p className="mt-1 text-[13px] text-subtle">— {t.author_name}</p>
                  </div>
                  <form action={deleteTestimonial.bind(null, t.id)}>
                    <button type="submit" className="text-[13px] text-subtle hover:text-danger">Remove</button>
                  </form>
                </div>
              ))}
            </div>
            <form action={addTestimonial} className="mt-3.5 flex flex-col gap-2.5 wide:flex-row wide:items-end">
              <label className="block flex-1">
                <span className={label}>Rider</span>
                <input name="author_name" type="text" disabled={!configured} placeholder="Adult rider, Bendigo" className={input} />
              </label>
              <label className="block flex-[2]">
                <span className={label}>Quote</span>
                <input name="quote" type="text" disabled={!configured} className={input} />
              </label>
              <button type="submit" disabled={!configured} className="h-[50px] shrink-0 rounded-[var(--radius-pill)] border border-ink px-5 text-[15px] font-medium text-ink">Add</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
