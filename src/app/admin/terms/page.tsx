import { Button } from "@/components/ui/button";
import { AdminTermRow, type Term } from "@/components/admin-term-row";
import { createClient } from "@/lib/supabase/server";
import { createTerm, renameTerm, changeTermSlug, toggleTermActive, toggleGeneratesPages } from "./actions";

export const metadata = { title: "Terms" };

const KIND_LABELS: Record<Term["kind"], string> = {
  discipline: "Disciplines",
  skill: "Skills",
  attribute: "Attributes",
};

export default async function AdminTermsPage() {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("terms")
    .select("id, kind, slug, name, generates_pages, active")
    .order("kind")
    .order("sort_order");
  const terms = (data ?? []) as Term[];

  const byKind: Record<Term["kind"], Term[]> = {
    discipline: terms.filter((t) => t.kind === "discipline"),
    skill: terms.filter((t) => t.kind === "skill"),
    attribute: terms.filter((t) => t.kind === "attribute"),
  };

  return (
    <div className="flex flex-col gap-10">
      {(Object.keys(byKind) as Term["kind"][]).map((kind) => (
        <section key={kind}>
          <h2 className="text-lg font-semibold text-fg">{KIND_LABELS[kind]}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {byKind[kind].map((term) => (
              <AdminTermRow
                key={term.id}
                term={term}
                onRename={renameTerm.bind(null, term.id)}
                onChangeSlug={changeTermSlug.bind(null, term.id)}
                onToggleGeneratesPages={toggleGeneratesPages.bind(null, term.id, !term.generates_pages)}
                onToggleActive={toggleTermActive.bind(null, term.id, !term.active)}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-fg">Add a term</h2>
        <form action={createTerm} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-sm font-medium text-fg">Name</span>
            <input
              name="name"
              required
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Kind</span>
            <select
              name="kind"
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg"
            >
              <option value="discipline">Discipline</option>
              <option value="skill">Skill</option>
              <option value="attribute">Attribute</option>
            </select>
          </label>
          <Button type="submit">Add</Button>
        </form>
      </section>
    </div>
  );
}
