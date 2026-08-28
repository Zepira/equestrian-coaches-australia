import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { addAlias, removeAlias } from "./actions";

export const metadata = { title: "Aliases" };

export default async function AdminAliasesPage() {
  const supabase = await createClient();
  if (!supabase) return null;

  const [{ data: aliasRows }, { data: terms }] = await Promise.all([
    supabase
      .from("term_aliases")
      .select("id, alias, source, is_primary, terms(name, kind)")
      .order("alias"),
    supabase.from("terms").select("id, name, kind").eq("active", true).order("kind").order("name"),
  ]);

  const aliases = (aliasRows ?? []) as unknown as {
    id: string;
    alias: string;
    source: string;
    is_primary: boolean;
    terms: { name: string; kind: string } | null;
  }[];

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-semibold text-fg">
          {aliases.length} alias{aliases.length === 1 ? "" : "es"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Matching vocabulary only — never shown as a list on the site itself (see CLAUDE.md,
          &ldquo;Where aliases go, and where they must not&rdquo;).
        </p>
        <div className="mt-4 flex flex-col gap-1.5">
          {aliases.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-tile)] border border-border bg-surface px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium text-fg">{a.alias}</span>
                <span className="text-muted"> → {a.terms?.name ?? "—"}</span>
                {a.is_primary && (
                  <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-fg">
                    primary
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-muted">{a.source}</span>
                <form action={removeAlias.bind(null, a.id)}>
                  <button type="submit" className="text-sm text-danger">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-fg">Add an alias</h2>
        <form action={addAlias} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-sm font-medium text-fg">Term</span>
            <select
              name="term_id"
              required
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg"
            >
              {(terms ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.kind})
                </option>
              ))}
            </select>
          </label>
          <label className="block flex-1">
            <span className="mb-1 block text-sm font-medium text-fg">Alias</span>
            <input
              name="alias"
              required
              placeholder="e.g. flatwork coach"
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted"
            />
          </label>
          <Button type="submit">Add</Button>
        </form>
      </section>
    </div>
  );
}
