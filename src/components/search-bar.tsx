"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { disciplines } from "@/lib/disciplines";
import { PillDropdown } from "@/components/pill-dropdown";

type Term = { slug: string; name: string };

const QUICK_ATTRIBUTE_SLUGS = ["horses-available", "indoor-arena"];
const QUICK_ATTRIBUTE_LABELS: Record<string, string> = {
  "horses-available": "Horses available",
  "indoor-arena": "Indoor arena",
};

export function SearchBar({
  defaultDiscipline = "",
  defaultLocation = "",
  skills = [],
  attributes = [],
}: {
  defaultDiscipline?: string;
  defaultLocation?: string;
  // Optional — only the homepage hero passes real skill/attribute term
  // lists in, so the "Skills & setup" row only renders there. Everything
  // picked here is uncommitted until "Find a coach" is clicked (unlike the
  // live-navigating version on /search itself): the dropdown would
  // otherwise navigate away from the homepage after the very first
  // checkbox, before a rider's finished picking.
  skills?: Term[];
  attributes?: Term[];
}) {
  const router = useRouter();
  const [discipline, setDiscipline] = useState(defaultDiscipline);
  const [location, setLocation] = useState(defaultLocation);
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);
  const [attributeSlugs, setAttributeSlugs] = useState<string[]>([]);

  const quickAttributes = attributes.filter((a) => QUICK_ATTRIBUTE_SLUGS.includes(a.slug));

  function toggleQuickAttribute(slug: string) {
    setAttributeSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (discipline) params.set("d", discipline);
    if (location) params.set("location", location);
    if (skillSlugs.length > 0) params.set("s", skillSlugs.join(","));
    if (attributeSlugs.length > 0) params.set("a", attributeSlugs.join(","));
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-border bg-surface p-2.5 sm:flex-row sm:items-stretch">
        <label className="flex-1 px-2.5 py-1.5">
          <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-subtle">
            Discipline
          </span>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            className="w-full appearance-none bg-transparent py-1 text-[17px] text-ink outline-none"
          >
            <option value="">Any discipline</option>
            {disciplines.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <div className="hidden w-px bg-border sm:block" />
        <label className="flex-1 px-2.5 py-1.5">
          <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-subtle">
            Suburb or postcode
          </span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Bendigo VIC"
            className="w-full bg-transparent py-1 text-[17px] text-ink placeholder:text-subtle outline-none"
          />
        </label>
        <button
          type="submit"
          className="rounded-[var(--radius-control)] bg-accent px-8 py-3 text-[17px] font-semibold text-accent-fg transition-colors hover:opacity-90 sm:self-stretch"
        >
          Find a coach
        </button>
      </div>

      {(skills.length > 0 || attributes.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <PillDropdown
            label="Skills & setup"
            groups={[
              {
                key: "s",
                heading: "Skills — what they help you fix",
                options: skills.map((t) => ({ value: t.slug, label: t.name })),
              },
              {
                key: "a",
                heading: "Setup — what they offer",
                options: attributes.map((t) => ({ value: t.slug, label: t.name })),
              },
            ]}
            selected={{ s: skillSlugs, a: attributeSlugs }}
            onApply={(next) => {
              setSkillSlugs(next.s ?? []);
              setAttributeSlugs(next.a ?? []);
            }}
          />
          {quickAttributes.map((attr) => {
            const active = attributeSlugs.includes(attr.slug);
            return (
              <button
                key={attr.slug}
                type="button"
                onClick={() => toggleQuickAttribute(attr.slug)}
                aria-pressed={active}
                className={`shrink-0 rounded-[var(--radius-control)] border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "pennant border-ink bg-ink text-ink-fg"
                    : "border-border bg-surface text-fg hover:border-ink"
                }`}
              >
                {QUICK_ATTRIBUTE_LABELS[attr.slug] ?? attr.name}
              </button>
            );
          })}
        </div>
      )}
    </form>
  );
}
