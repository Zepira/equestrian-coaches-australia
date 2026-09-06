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
  tone = "light",
}: {
  defaultDiscipline?: string;
  defaultLocation?: string;
  /** "dark" restyles the refine pills for the ink hero background. The
   *  search panel itself is a cream plate in both tones. */
  tone?: "light" | "dark";
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

  const idlePill =
    tone === "dark"
      ? "border-ink-fg/50 bg-ink-fg/10 text-ink-fg backdrop-blur-[2px] hover:border-ink-fg"
      : "border-border bg-surface text-fg hover:border-accent";

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
      {/* Below `sm`, when the fields wrap into a stacked column, each one is
          its OWN bordered field — not one shared surface with the border
          hidden. At `sm` and up they merge back into a single connected
          block (shared border/background, a hairline divider between them)
          the way a horizontal search bar reads. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0 sm:rounded-[4px] sm:border sm:border-border sm:bg-surface sm:p-2.5 sm:shadow-[0_12px_30px_rgba(31,58,46,0.06)]">
        <label className="rounded-[4px] border border-border bg-surface px-3 py-2 shadow-[0_12px_30px_rgba(31,58,46,0.06)] sm:flex-1 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-2.5 sm:py-1.5 sm:shadow-none">
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
        <label className="rounded-[4px] border border-border bg-surface px-3 py-2 shadow-[0_12px_30px_rgba(31,58,46,0.06)] sm:flex-1 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-2.5 sm:py-1.5 sm:shadow-none">
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
          className="rounded-[var(--radius-control)] bg-accent px-8 py-3 text-[17px] font-semibold text-accent-fg transition-colors hover:bg-accent-hover sm:self-stretch"
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
            idleClassName={idlePill}
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
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent text-accent-fg"
                    : idlePill
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
