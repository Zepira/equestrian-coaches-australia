"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Term = { slug: string; name: string };

// Multi-select discipline facet — OR within the kind (spec: "dressage or
// show jumping"). Writes a comma-separated `d` param so the URL stays
// shareable: /search?d=dressage,show-jumping.
export function DisciplineFilter({ disciplines }: { disciplines: Term[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = new Set((searchParams.get("d") ?? "").split(",").filter(Boolean));

  function toggle(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);

    const params = new URLSearchParams(searchParams.toString());
    if (next.size > 0) params.set("d", Array.from(next).join(","));
    else params.delete("d");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {disciplines.map((d) => {
        const active = selected.has(d.slug);
        return (
          <button
            key={d.slug}
            type="button"
            onClick={() => toggle(d.slug)}
            aria-pressed={active}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-surface text-fg hover:border-accent"
            }`}
          >
            {d.name}
          </button>
        );
      })}
    </div>
  );
}
