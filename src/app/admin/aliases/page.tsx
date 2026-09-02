import { Button } from "@/components/ui/button";
import { AdminAliasRow, type Alias } from "@/components/admin-alias-row";
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

  const aliases = (aliasRows ?? []) as unknown as Alias[];

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
            <AdminAliasRow key={a.id} alias={a} onRemove={removeAlias.bind(null, a.id)} />
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
