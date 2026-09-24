"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { GLYPHS, ProfessionGlyph, type GlyphKey } from "@/components/profession-glyph";
import { saveProfession, type ProfessionSaveState } from "../actions";

type Item = { title: string; body: string };
type Option = { value: string; label: string };
type Check = { key: string; label: string; weight: number };

export type ProfessionRow = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  profession_details: {
    door: string;
    glyph_key: string;
    launch_state: string;
    singular: string;
    plural: string;
    short_name: string | null;
    term_noun: string;
    term_noun_plural: string;
    audience_noun: string;
    years_label: string;
    job_title: string;
    hero_headline: string;
    hero_lead: string;
    hero_lead_short: string;
    pitch: string;
    steps: Item[];
    faq: Item[];
    enquiry_options: Option[];
    tier_labels: Record<string, string>;
    completeness: Check[];
    events_enabled: boolean;
    remote_allowed: boolean;
  };
};

const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[15px] text-fg";
const CHECK_KEYS: { key: string; what: string }[] = [
  { key: "photo", what: "They've uploaded a photo" },
  { key: "bio", what: "They've written a bio" },
  { key: "terms", what: "They've tagged what they do" },
  { key: "location", what: "They've set where they are" },
  { key: "testimonials", what: "They have three testimonials" },
  { key: "video", what: "They've added a video (skipped on plans without video)" },
];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-[16px] border border-border bg-surface p-4 sm:p-5">
      <legend className="px-1 font-display text-[20px] text-ink">{title}</legend>
      {note && <p className="-mt-2 text-[13px] text-subtle">{note}</p>}
      {children}
    </fieldset>
  );
}

function Text({ name, label, value, hint, long, maxLength }: { name: string; label: string; value: string; hint?: string; long?: boolean; maxLength?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[14px] font-medium text-fg">
        {label}
        {hint && <span className="ml-2 text-[13px] font-normal text-subtle">{hint}</span>}
      </span>
      {long ? <textarea name={name} defaultValue={value} rows={3} maxLength={maxLength} className={input} /> : <input name={name} defaultValue={value} maxLength={maxLength} className={input} />}
    </label>
  );
}

/** Heading-and-text rows, submitted as prefix.N.a / prefix.N.b; a blank row is dropped on save. */
function Rows({ prefix, items, a, b, aLabel, bLabel }: { prefix: string; items: Record<string, string>[]; a: string; b: string; aLabel: string; bLabel: string }) {
  const [n, setN] = useState(Math.max(items.length, 1));
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="grid gap-2 rounded-[12px] border border-border p-3 sm:grid-cols-[1fr_2fr]">
          <input name={`${prefix}.${i}.${a}`} defaultValue={items[i]?.[a] ?? ""} aria-label={`${aLabel} ${i + 1}`} placeholder={aLabel} className={input} />
          <textarea name={`${prefix}.${i}.${b}`} defaultValue={items[i]?.[b] ?? ""} aria-label={`${bLabel} ${i + 1}`} placeholder={bLabel} rows={2} className={input} />
        </div>
      ))}
      <p className="text-[13px] text-subtle">
        Empty both boxes to remove one.{" "}
        {n < 12 && <button type="button" onClick={() => setN(n + 1)} className="font-medium text-accent">Add one</button>}
      </p>
    </div>
  );
}

export function ProfessionForm({ row, slugLocked, planNames }: { row: ProfessionRow; slugLocked: boolean; planNames: Record<string, string> }) {
  const d = row.profession_details;
  const [state, action, pending] = useActionState<ProfessionSaveState, FormData>(saveProfession.bind(null, row.id), null);
  const [glyph, setGlyph] = useState(d.glyph_key);
  const checks = new Map(d.completeness.map((c) => [c.key, c]));

  return (
    <form action={action} className="flex flex-col gap-6">
      <Section title="On the site">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Launch state</span>
            <select name="launch_state" defaultValue={d.launch_state} className={input}>
              <option value="draft">Draft: admins only</option>
              <option value="taking_signups">Taking sign-ups: pitch page only</option>
              <option value="live">Live: everywhere</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Door</span>
            <select name="door" defaultValue={d.door} className={input}>
              <option value="coaches">Coaches (terracotta)</option>
              <option value="horse_care">Horse care (steel)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Address</span>
            <input name="slug" defaultValue={row.slug} readOnly={slugLocked} className={`${input} ${slugLocked ? "bg-shade text-subtle" : ""}`} />
            {slugLocked && <span className="mt-1 block text-[12px] text-subtle">Fixed once it&rsquo;s out of draft or anyone is on it.</span>}
          </label>
        </div>
        <div>
          <span className="mb-1 block text-[14px] font-medium text-fg">Icon</span>
          <input type="hidden" name="glyph_key" value={glyph} />
          <div role="radiogroup" aria-label="Icon" className="flex flex-wrap gap-2">
            {(Object.keys(GLYPHS) as GlyphKey[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={glyph === k}
                aria-label={k}
                title={k}
                onClick={() => setGlyph(k)}
                className={`rounded-[10px] border p-2.5 ${glyph === k ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:border-fg"}`}
              >
                <ProfessionGlyph slug={k} size={24} />
              </button>
            ))}
          </div>
          <span className="mt-1 block text-[12px] text-subtle">A new icon is drawn to the same grid and added in code, so they stay consistent.</span>
        </div>
        <div className="flex flex-wrap gap-6 text-[14px]">
          <label className="flex items-center gap-2"><input type="checkbox" name="events_enabled" defaultChecked={d.events_enabled} /> Can list events</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="remote_allowed" defaultChecked={d.remote_allowed} /> Can work remotely</label>
        </div>
      </Section>

      <Section title="Names">
        <div className="grid gap-4 sm:grid-cols-2">
          <Text name="name" label="Name, as in the menu" value={row.name} maxLength={40} />
          <Text name="short_name" label="Short name" hint="for tight spots, optional" value={d.short_name ?? ""} maxLength={20} />
          <Text name="singular" label="One of them" value={d.singular} maxLength={40} />
          <Text name="plural" label="More than one" value={d.plural} maxLength={40} />
          <Text name="job_title" label="Job title" hint="in search listings" value={d.job_title} maxLength={60} />
          <Text name="years_label" label="Experience label" hint='"years coaching"' value={d.years_label} maxLength={40} />
          <Text name="term_noun" label="What they do, one" hint='"speciality"' value={d.term_noun} maxLength={30} />
          <Text name="term_noun_plural" label="What they do, more than one" value={d.term_noun_plural} maxLength={30} />
          <Text name="audience_noun" label="Who looks for them" hint='"horse owner"' value={d.audience_noun} maxLength={30} />
        </div>
        <Text name="blurb" label="One line about them" hint="the section page and the tiles" value={row.blurb} long maxLength={300} />
      </Section>

      <Section title="Section page" note="The top of its own page. Empty, the page shows the name and the one line about them. *words* in the headline are the accent italic.">
        <Text name="hero_headline" label="Headline" value={d.hero_headline} maxLength={80} />
        <Text name="hero_lead" label="Line under it" value={d.hero_lead} long maxLength={400} />
        <Text name="hero_lead_short" label="Line under it, on phones" value={d.hero_lead_short} long maxLength={200} />
        <span className="text-[14px] font-medium text-fg">How it works</span>
        <Rows prefix="steps" items={d.steps} a="title" b="body" aLabel="Step" bLabel="What happens" />
      </Section>

      <Section title="Pitch to them" note="On /for-professionals when they pick this profession. Write it after talking to real ones; until then the general pitch shows.">
        <Text name="pitch" label="The pitch" hint="**words** are bold" value={d.pitch} long maxLength={2000} />
        <span className="text-[14px] font-medium text-fg">Their questions</span>
        <Rows prefix="faq" items={d.faq} a="title" b="body" aLabel="Question" bLabel="Answer" />
      </Section>

      <Section title="Enquiries" note="What someone picks on the enquiry form. The value is filled in from the label if left blank; once enquiries use it, keep it.">
        <Rows prefix="options" items={d.enquiry_options} a="label" b="value" aLabel="Label" bLabel="Value" />
      </Section>

      <Section title="Plan names" note="Only where the shared name reads oddly for this profession. Empty uses the shared name.">
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(planNames).map(([t, n]) => (
            <Text key={t} name={`tier.${t}`} label={n} value={d.tier_labels?.[t] ?? ""} maxLength={30} />
          ))}
        </div>
      </Section>

      <Section title="Profile checklist" note="What the dashboard and the monthly email ask them to do next, in the order shown. A higher weight counts for more of the score.">
        {CHECK_KEYS.map(({ key, what }) => {
          const c = checks.get(key);
          return (
            <div key={key} className="grid items-center gap-2 sm:grid-cols-[auto_1fr_80px]">
              <label className="flex items-center gap-2 text-[14px] text-fg sm:w-[260px]">
                <input type="checkbox" name={`completeness.${key}.on`} defaultChecked={Boolean(c)} /> {what}
              </label>
              <input name={`completeness.${key}.label`} defaultValue={c?.label ?? ""} aria-label={`Wording: ${what}`} placeholder="How it reads" className={input} />
              <input name={`completeness.${key}.weight`} type="number" min={1} max={5} defaultValue={c?.weight ?? 1} aria-label={`Weight: ${what}`} className={input} />
            </div>
          );
        })}
      </Section>

      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-border bg-bg/95 px-1 py-3 backdrop-blur">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        {state && <p role="status" className={`text-[14px] ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
