"use client";

import { useState } from "react";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { saveRiderPreferences } from "./actions";

type Term = { id: string; name: string };

const chipOff = "border-border bg-surface text-muted";

/**
 * Clinic alerts (canvas: Rider account 1c/1d). "My area" is the same
 * suburb autocomplete the search bar uses; the discipline chips are
 * checkboxes styled with `has-checked:` so no JS is needed for the toggle
 * and the plain form still posts every picked id as `discipline`.
 */
export function ClinicAlertsForm({ area: initialArea, disciplines, followedIds, saved }: { area: string; disciplines: Term[]; followedIds: string[]; saved: boolean }) {
  const [area, setArea] = useState(initialArea);
  return (
    <form action={saveRiderPreferences} data-alerts-form className="mt-3.5 rounded-[16px] border border-border bg-surface p-4 wide:mt-0 wide:rounded-[18px] wide:border-0 wide:p-0">
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.12em] text-subtle">My area</span>
        <input type="hidden" name="area" value={area} />
        <LocationAutocomplete
          value={area}
          onChange={setArea}
          onSelect={(s) => setArea(s.value)}
          placeholder="Suburb or postcode"
          inputClassName="w-full rounded-[12px] border border-border bg-white px-3.5 h-12 text-[15px] text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
        />
      </label>
      <span className="mt-4 mb-2 block text-[12px] font-medium uppercase tracking-[0.12em] text-subtle">Disciplines I follow</span>
      <div className="flex flex-wrap gap-1.5" data-follow-chips>
        {disciplines.map((d) => (
          <label
            key={d.id}
            className={`cursor-pointer rounded-[var(--radius-pill)] border px-3 py-[7px] text-[13px] font-medium transition-[background-color,border-color,color] duration-200 has-checked:border-accent has-checked:bg-accent/8 has-checked:text-accent ${chipOff}`}
          >
            <input type="checkbox" name="discipline" value={d.id} defaultChecked={followedIds.includes(d.id)} className="sr-only" />
            {d.name}
          </label>
        ))}
      </div>
      <button type="submit" className={`mt-4 h-12 w-full rounded-[var(--radius-pill)] bg-ink text-[15px] font-semibold text-ink-fg transition-colors duration-200 hover:bg-ink-card wide:mt-[18px]`}>
        Save alerts
      </button>
      {saved && (
        <p role="status" className="mt-3 text-center text-[13px] text-muted">
          Alerts saved. One email when something near you comes up.
        </p>
      )}
    </form>
  );
}
