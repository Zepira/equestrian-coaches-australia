"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { disciplines } from "@/lib/disciplines";
import { Button } from "@/components/ui/button";

export function SearchBar({
  defaultDiscipline = "",
  defaultLocation = "",
}: {
  defaultDiscipline?: string;
  defaultLocation?: string;
}) {
  const router = useRouter();
  const [discipline, setDiscipline] = useState(defaultDiscipline);
  const [location, setLocation] = useState(defaultLocation);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (discipline) params.set("discipline", discipline);
    if (location) params.set("location", location);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-stretch sm:gap-2 sm:p-2"
    >
      <label className="flex-1">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Discipline
        </span>
        <select
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
        >
          <option value="">Any discipline</option>
          {disciplines.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex-1">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Suburb or postcode
        </span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Bendigo VIC"
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted"
        />
      </label>
      <Button type="submit" className="w-full sm:w-auto sm:self-end">
        Find a coach
      </Button>
    </form>
  );
}
