"use client";

import { useState } from "react";

type Option = { slug: string; name: string; termNoun: string; termNounPlural: string; terms: { id: string; name: string }[] };

/**
 * Step 1's fields. The speciality list follows the profession picked above it
 * (a vet sees services, a coach disciplines), so this part is client-side;
 * the inputs are ordinary named fields and AutosaveForm saves them.
 */
export function WhatStep({ options, primary, second, picked }: { options: Option[]; primary: string; second: string; picked: string[] }) {
  const [profession, setProfession] = useState(primary);
  const current = options.find((o) => o.slug === profession) ?? options[0];
  const others = options.filter((o) => o.slug !== profession);

  return (
    <>
      <fieldset>
        <legend className="text-[15px] font-semibold text-fg">Your main work</legend>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[560px]:grid-cols-2">
          {options.map((o) => (
            <label key={o.slug} className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 has-[:checked]:border-accent">
              <input type="radio" name="profession" value={o.slug} checked={profession === o.slug} onChange={() => setProfession(o.slug)} className="accent-accent" />
              <span className="text-[15px] text-fg">{o.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-[15px] font-semibold text-fg">I also do…</span>
        <span className="mt-1 block text-[14px] text-muted">Optional. One plan covers both.</span>
        <select name="second" defaultValue={second} className="mt-2 w-full rounded-[12px] border border-border bg-surface px-3.5 py-3 text-[15px] text-fg">
          <option value="">Nothing else</option>
          {others.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset key={current.slug}>
        <legend className="text-[15px] font-semibold text-fg">Your {current.termNounPlural}</legend>
        <p className="mt-1 text-[14px] text-muted">Tick every {current.termNoun} you&apos;d want to be found for. You can change these later.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {current.terms.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-border bg-surface px-3.5 py-2 text-[14px] text-fg has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="checkbox" name="term" value={t.id} defaultChecked={picked.includes(t.id)} className="accent-accent" />
              {t.name}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
