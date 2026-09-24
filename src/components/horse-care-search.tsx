"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SelectMenu } from "@/components/ui/select-menu";
import { LocateButton } from "@/components/locate-button";
import { Caret } from "@/components/ui/caret";
import { sectionHref, type Profession } from "@/lib/professions";

/**
 * The Horse care door's search card: the coach card's shell and fields
 * (see SearchBar), with a profession in place of the discipline.
 *
 * With a profession picked it goes to that profession's section
 * (`sectionHref`, e.g. /farriers?location=Bendigo+VIC); with "Any
 * profession" to /horse-care/search, which lists everyone near the place.
 * With JavaScript off the form GETs /horse-care/search, which redirects to
 * the section when a profession was picked.
 *
 * `tone="glass"` sits on a hero photo; `tone="plain"` on a cream page.
 * `professions` is the Horse care door's list, from getProfessions().
 */
export function HorseCareSearch({
  professions: horseCare,
  defaultProfession = "",
  defaultLocation = "",
  tone = "glass",
}: {
  professions: Pick<Profession, "slug" | "name" | "open">[];
  defaultProfession?: string;
  defaultLocation?: string;
  tone?: "glass" | "plain";
}) {
  const router = useRouter();
  const [profession, setProfession] = useState(defaultProfession);
  const [location, setLocation] = useState(defaultLocation);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = horseCare.find((x) => x.slug === profession);
    const q = location.trim() ? `?location=${encodeURIComponent(location.trim())}` : "";
    router.push((p ? sectionHref(p) : "/horse-care/search") + q);
  }

  return (
    <div className="search-card">
      <form
        action="/horse-care/search"
        method="get"
        onSubmit={submit}
        aria-label="Search horse care"
        className={`relative flex flex-wrap gap-1.5 rounded-[14px] p-2 wide:rounded-[16px] ${
          tone === "glass" ? "border border-ink-fg/22 bg-ink-fg/12 backdrop-blur-[14px]" : "border border-border bg-shade"
        }`}
      >
        <label className="order-1 flex min-w-0 basis-full items-center gap-2.5 rounded-[9px] bg-surface px-3.5 text-fg wide:basis-0 wide:flex-[1.6] wide:rounded-[10px] wide:px-4">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
          <span className="sr-only">Suburb or postcode</span>
          <input
            ref={inputRef}
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Suburb or postcode"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-3 text-[18px] text-fg outline-none placeholder:text-subtle wide:py-4"
          />
          <LocateButton
            onLocated={(loc) => {
              setLocation(loc.value);
              inputRef.current?.focus();
            }}
          />
        </label>

        <SelectMenu
          label="Profession"
          value={profession}
          onChange={setProfession}
          placeholder="Any profession"
          options={horseCare.map((p) => ({ value: p.slug, label: p.name }))}
          className="js-only order-3 min-w-0 flex-1 wide:order-2 wide:min-w-[190px]"
          triggerClassName="flex h-full w-full items-center justify-between rounded-[9px] bg-surface px-3.5 py-[13px] text-left text-[16px] text-fg outline-none transition-colors duration-200 hover:bg-shade focus-visible:ring-2 focus-visible:ring-accent wide:rounded-[10px] wide:px-4 wide:py-4 wide:text-[18px]"
        />
        <label className="nojs-only nojs-select relative order-3 min-w-0 flex-1 items-center rounded-[9px] bg-surface px-3.5 text-fg wide:order-2 wide:rounded-[10px] wide:px-4">
          <span className="sr-only">Profession</span>
          <select
            name="p"
            defaultValue={defaultProfession}
            className="w-full appearance-none bg-transparent py-[13px] pr-[18px] text-[16px] text-fg outline-none wide:py-4 wide:text-[18px]"
          >
            <option value="">Any profession</option>
            {horseCare.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <Caret className="pointer-events-none absolute right-3.5 h-[1.1em] w-[1.1em] text-subtle wide:right-4" />
        </label>

        <button
          type="submit"
          className="order-4 flex min-h-12 w-[150px] shrink-0 items-center justify-center rounded-[9px] bg-accent px-[18px] text-center text-[16px] font-semibold leading-tight text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover wide:order-3 wide:w-[206px] wide:rounded-[10px]"
        >
          <span className="wide:hidden">Search</span>
          <span className="hidden wide:inline">Search horse care</span>
        </button>
      </form>
    </div>
  );
}
