"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PillDropdown } from "@/components/pill-dropdown";

type Term = { slug: string; name: string };

// Quick one-click toggles for the setup attributes riders filter on most —
// no dropdown needed, they're common enough to earn a permanent pill. Kept
// to a couple so this row still reads as "search", not a form.
const QUICK_ATTRIBUTE_SLUGS = ["horses-available", "indoor-arena"];
// Shorter labels for the pill itself — the full term name ("Horses
// available for lessons") is right for a checkbox list, too long for a
// compact pill sitting next to a dropdown.
const QUICK_ATTRIBUTE_LABELS: Record<string, string> = {
  "horses-available": "Horses available",
  "indoor-arena": "Indoor arena",
};

function toGroupSelection(searchParams: URLSearchParams, paramName: string) {
  return (searchParams.get(paramName) ?? "").split(",").filter(Boolean);
}

function writeParams(
  searchParams: URLSearchParams,
  updates: Record<string, string[]>
): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  for (const [param, values] of Object.entries(updates)) {
    if (values.length > 0) next.set(param, values.join(","));
    else next.delete(param);
  }
  return next;
}

// The live, URL-driven filter row for /search — a compact "Discipline" and
// "Skills & setup" dropdown pill (replacing what used to be every
// discipline/skill/attribute option rendered flat, ~65 pills wide) plus a
// couple of quick-toggle pills. Each dropdown applies (and navigates) as a
// single batch when it closes, not per checkbox click, so results don't
// reload between picks.
export function SearchFacets({
  disciplines,
  skills,
  attributes,
}: {
  disciplines: Term[];
  skills: Term[];
  attributes: Term[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const disciplineSlugs = toGroupSelection(searchParams, "d");
  const skillSlugs = toGroupSelection(searchParams, "s");
  const attributeSlugs = toGroupSelection(searchParams, "a");
  const quickAttributes = attributes.filter((a) => QUICK_ATTRIBUTE_SLUGS.includes(a.slug));

  function navigate(updates: Record<string, string[]>) {
    router.push(`/search?${writeParams(searchParams, updates).toString()}`);
  }

  function toggleQuickAttribute(slug: string) {
    const next = new Set(attributeSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    navigate({ a: Array.from(next) });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {disciplines.length > 0 && (
        <PillDropdown
          label="Discipline"
          groups={[{ key: "d", options: disciplines.map((t) => ({ value: t.slug, label: t.name })) }]}
          selected={{ d: disciplineSlugs }}
          onApply={(next) => navigate({ d: next.d ?? [] })}
        />
      )}

      {(skills.length > 0 || attributes.length > 0) && (
        <PillDropdown
          label="Skills & setup"
          groups={[
            { key: "s", heading: "Skills — what they help you fix", options: skills.map((t) => ({ value: t.slug, label: t.name })) },
            { key: "a", heading: "Setup — what they offer", options: attributes.map((t) => ({ value: t.slug, label: t.name })) },
          ]}
          selected={{ s: skillSlugs, a: attributeSlugs }}
          onApply={(next) => navigate({ s: next.s ?? [], a: next.a ?? [] })}
        />
      )}

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
                : "border-border bg-surface text-fg hover:border-accent"
            }`}
          >
            {QUICK_ATTRIBUTE_LABELS[attr.slug] ?? attr.name}
          </button>
        );
      })}
    </div>
  );
}
