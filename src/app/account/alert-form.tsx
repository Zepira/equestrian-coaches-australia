"use client";

import { useState } from "react";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { saveAlert } from "./actions";

export type AlertProfession = {
  id: string;
  slug: string;
  name: string;
  singular: string;
  termNounPlural: string;
  door: "coaches" | "horse_care";
  terms: { id: string; slug: string; name: string }[];
};
export type AlertDefaults = {
  id?: string;
  place: string;
  radiusKm: number;
  who: string;
  termIds: string[];
  wantsEvents: boolean;
  wantsNewProviders: boolean;
  source?: "account" | "search";
};

const label = "mb-1.5 block text-[12px] font-medium uppercase tracking-[0.12em] text-subtle";
const field = "w-full rounded-[12px] border border-border bg-white px-3.5 h-12 text-[15px] text-fg focus:border-accent focus:outline-none";

/**
 * One alert (The Site as a CMS §07.1): where, how far, who, optionally which
 * disciplines or specialities, and what to hear about. The speciality chips
 * follow the profession picked, so this is a client component; the fields
 * are plain named inputs and the server action does the rest.
 */
/** The consent words shown on the form (consent_wordings), and whether the round-up is already on. */
export type AlertConsent = { alerts: { id: string; body: string } | null; news: { id: string; body: string } | null; newsOn: boolean };

export function AlertForm({ professions, defaults, submitLabel, consent }: { professions: AlertProfession[]; defaults: AlertDefaults; submitLabel: string; consent: AlertConsent }) {
  const [place, setPlace] = useState(defaults.place);
  const [who, setWho] = useState(defaults.who);
  const picked = who.startsWith("p:") ? professions.find((p) => p.id === who.slice(2)) : undefined;
  const coaches = professions.filter((p) => p.door === "coaches");
  const horseCare = professions.filter((p) => p.door === "horse_care");
  const noun = picked ? picked.singular : who === "door:horse_care" ? "horse care professional" : "professional";

  return (
    <form action={saveAlert} className="flex flex-col gap-4">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {defaults.source && <input type="hidden" name="source" value={defaults.source} />}
      <label className="block">
        <span className={label}>Near</span>
        <input type="hidden" name="place" value={place} />
        <LocationAutocomplete value={place} onChange={setPlace} onSelect={(s) => setPlace(s.value)} placeholder="Suburb or postcode" inputClassName={field} />
      </label>
      <label className="block">
        <span className={label}>How far</span>
        <select name="radius_km" defaultValue={String(defaults.radiusKm)} className={field}>
          {[25, 50, 100, 200].map((r) => (
            <option key={r} value={r}>
              Within {r} km
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={label}>Who</span>
        <select name="who" value={who} onChange={(e) => setWho(e.target.value)} className={field}>
          <option value="">Everyone on the site</option>
          {coaches.map((p) => (
            <option key={p.id} value={`p:${p.id}`}>
              {p.name}
            </option>
          ))}
          {horseCare.length > 0 && <option value="door:horse_care">All horse care</option>}
          {horseCare.map((p) => (
            <option key={p.id} value={`p:${p.id}`}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {picked && picked.terms.length > 0 && (
        <fieldset>
          <legend className={label}>Only these {picked.termNounPlural} (optional)</legend>
          <div className="flex flex-wrap gap-1.5">
            {picked.terms.map((t) => (
              <label
                key={t.id}
                className="cursor-pointer rounded-[var(--radius-pill)] border border-border bg-surface px-3 py-[7px] text-[13px] font-medium text-muted has-checked:border-accent has-checked:bg-accent/8 has-checked:text-accent"
              >
                <input type="checkbox" name="term" value={t.id} defaultChecked={defaults.termIds.includes(t.id)} className="sr-only" />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className={label}>Tell me about</legend>
        <label className="flex items-center gap-2.5 text-[15px] text-fg">
          <input type="checkbox" name="wants_events" defaultChecked={defaults.wantsEvents} className="accent-accent" />
          Clinics and events
        </label>
        <label className="flex items-center gap-2.5 text-[15px] text-fg">
          <input type="checkbox" name="wants_new_providers" defaultChecked={defaults.wantsNewProviders} className="accent-accent" />A new {noun} starting near me
        </label>
      </fieldset>
      {consent.alerts && (
        <>
          <input type="hidden" name="alerts_wording" value={consent.alerts.id} />
          <p className="text-[13px] leading-[1.5] text-subtle">{consent.alerts.body}</p>
        </>
      )}
      {consent.news && !consent.newsOn && (
        <label className="flex gap-2.5 text-[14px] leading-[1.45] text-fg">
          <input type="checkbox" name="news_wording" value={consent.news.id} className="mt-0.5 accent-accent" />
          <span>{consent.news.body}</span>
        </label>
      )}
      <button type="submit" className="h-12 w-full rounded-[var(--radius-pill)] bg-ink text-[15px] font-semibold text-ink-fg transition-colors duration-200 hover:bg-ink-card">
        {submitLabel}
      </button>
    </form>
  );
}
