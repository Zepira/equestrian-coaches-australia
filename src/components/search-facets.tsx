"use client";

import { useEffect, useState } from "react";
import { MultiSelectMenu, type TermOption } from "@/components/ui/multi-select-menu";
import { useChipState } from "@/components/search-chips";

/**
 * The URL-driven half of the "Skills & setup" picker, for /search. The quick
 * chips beside it (SearchChips) cover the six setups riders ask for most;
 * this is the whole vocabulary behind one pill, so a rider after "float
 * loading" or "OTTB retraining" can actually get there.
 *
 * Applying writes `s` (skills) and `a` (attributes) into the existing query
 * string rather than replacing it, so it composes with the chips, the radius
 * and the discipline instead of clobbering them.
 *
 * `skills`/`attributes` come from the server where the caller has them; the
 * rail inside SiteHeader can't, so it falls back to /api/terms.
 */
export function SearchFacets({
  skills,
  attributes,
  className = "",
  tone = "light",
}: {
  skills?: TermOption[];
  attributes?: TermOption[];
  className?: string;
  tone?: "light" | "ink";
}) {
  const injected = Boolean(skills || attributes);
  const [vocab, setVocab] = useState<{ skills: TermOption[]; attributes: TermOption[] }>({
    skills: skills ?? [],
    attributes: attributes ?? [],
  });
  const { params, push } = useChipState();

  useEffect(() => {
    if (injected) return;
    const controller = new AbortController();
    fetch("/api/terms", { signal: controller.signal })
      .then((r) => r.json())
      .then((d: { skills: TermOption[]; attributes: TermOption[] }) =>
        setVocab({ skills: d.skills ?? [], attributes: d.attributes ?? [] })
      )
      .catch(() => {});
    return () => controller.abort();
  }, [injected]);

  const skillSlugs = new Set(vocab.skills.map((t) => t.slug));
  const selected = [
    ...(params.get("s") ?? "").split(",").filter(Boolean),
    ...(params.get("a") ?? "").split(",").filter(Boolean),
  ];

  // Nothing to pick from — don't render a pill that opens an empty panel.
  if (vocab.skills.length === 0 && vocab.attributes.length === 0) return null;

  function apply(next: string[]) {
    const p = new URLSearchParams(params.toString());
    const picked = { s: next.filter((v) => skillSlugs.has(v)), a: next.filter((v) => !skillSlugs.has(v)) };
    for (const key of ["s", "a"] as const) {
      if (picked[key].length) p.set(key, picked[key].join(","));
      else p.delete(key);
    }
    p.delete("edit");
    push(p);
  }

  const on = selected.length > 0;
  const idle =
    tone === "ink"
      ? "border-ink-fg/30 bg-ink-fg/10 text-ink-fg hover:bg-ink-fg/20"
      : "border-border bg-surface/90 text-fg hover:bg-shade";

  return (
    <MultiSelectMenu
      label="Skills & setup"
      className={`shrink-0 ${className}`}
      groups={[
        { heading: "What they help you fix", options: vocab.skills },
        { heading: "What they offer", options: vocab.attributes },
      ].filter((g) => g.options.length > 0)}
      selected={selected}
      onApply={apply}
      triggerClassName={`flex shrink-0 items-center whitespace-nowrap rounded-[var(--radius-pill)] border px-[13px] py-2 text-[13px] font-medium transition-colors duration-200 wide:px-3.5 wide:py-[9px] ${
        on ? "border-accent bg-accent text-accent-fg" : idle
      }`}
    />
  );
}
