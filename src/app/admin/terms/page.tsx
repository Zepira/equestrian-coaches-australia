import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createTerm, renameTerm, toggleTermActive, toggleGeneratesPages } from "./actions";

export const metadata = { title: "Terms" };

type TermRow = {
  id: string;
  kind: "discipline" | "skill" | "attribute";
  slug: string;
  name: string;
  generates_pages: boolean;
  active: boolean;
};

const KIND_LABELS: Record<TermRow["kind"], string> = {
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
  const terms = (data ?? []) as TermRow[];

  const byKind: Record<TermRow["kind"], TermRow[]> = {
    discipline: terms.filter((t) => t.kind === "discipline"),
    skill: terms.filter((t) => t.kind === "skill"),
    attribute: terms.filter((t) => t.kind === "attribute"),
  };

  return (
    <div className="flex flex-col gap-10">
      {(Object.keys(byKind) as TermRow["kind"][]).map((kind) => (
        <section key={kind}>
          <h2 className="text-lg font-semibold text-fg">{KIND_LABELS[kind]}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {byKind[kind].map((term) => (
              <div
                key={term.id}
                className={`flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between ${
                  !term.active ? "opacity-50" : ""
                }`}
              >
                <form action={renameTerm.bind(null, term.id)} className="flex flex-1 items-center gap-2">
                  <input
                    name="name"
                    defaultValue={term.name}
                    className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg sm:max-w-xs"
                  />
                  <code className="shrink-0 text-xs text-muted">/{term.slug}</code>
                  <button type="submit" className="shrink-0 text-sm font-medium text-accent">
                    Save
                  </button>
                </form>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  {kind === "discipline" && (
                    <span className="text-muted">
                      pages: <strong className="text-fg">{term.generates_pages ? "on" : "off"}</strong>
                    </span>
                  )}
                  {kind !== "discipline" && (
                    <form action={toggleGeneratesPages.bind(null, term.id, !term.generates_pages)}>
                      <button type="submit" className="text-muted hover:text-fg">
                        pages: {term.generates_pages ? "on" : "off"}
                      </button>
                    </form>
                  )}
                  <form action={toggleTermActive.bind(null, term.id, !term.active)}>
                    <button type="submit" className={term.active ? "text-danger" : "text-accent"}>
                      {term.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                </div>
              </div>
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
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Kind</span>
            <select
              name="kind"
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
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
