import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { changeLog } from "@/lib/admin";
import { HistoryList } from "../history-list";
import { createTerm, renameTerm, changeTermSlug, setTermProfession, toggleTermActive, toggleGeneratesPages } from "./actions";

export const metadata = { title: "Terms" };

type TermRow = {
  id: string;
  kind: "discipline" | "skill" | "attribute";
  slug: string;
  name: string;
  generates_pages: boolean;
  active: boolean;
  parent_id: string | null;
};

const KIND_LABELS: Record<TermRow["kind"], string> = {
  discipline: "Disciplines and specialities",
  skill: "Skills",
  attribute: "Setup",
};

/**
 * /admin/terms: the vocabulary, one profession at a time (?p=). Disciplines
 * and specialities belong to their profession for good (it's in their
 * address); skills and setup can belong to one profession or be shared by
 * all, and move with the "Belongs to" control.
 */
export default async function AdminTermsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;

  const [{ data }, { data: profs }] = await Promise.all([
    supabase.from("terms").select("id, kind, slug, name, generates_pages, active, parent_id").neq("kind", "profession").order("kind").order("sort_order"),
    supabase.from("terms").select("id, slug, name").eq("kind", "profession").order("sort_order"),
  ]);
  const professions = profs ?? [];
  const profession = professions.find((x) => x.slug === (p ?? "coaches")) ?? professions[0];
  const all = (data ?? []) as TermRow[];
  const terms = all.filter((t) => t.parent_id === profession?.id || (t.kind !== "discipline" && t.parent_id === null));

  const byName = (a: TermRow, b: TermRow) => a.name.localeCompare(b.name);
  const byKind: Record<TermRow["kind"], TermRow[]> = {
    discipline: terms.filter((t) => t.kind === "discipline").sort(byName),
    skill: terms.filter((t) => t.kind === "skill").sort(byName),
    attribute: terms.filter((t) => t.kind === "attribute").sort(byName),
  };
  const history = await changeLog(supabase, { table: ["terms", "term_aliases"] });

  return (
    <div className="flex flex-col gap-10">
      <nav aria-label="Profession" className="flex flex-wrap gap-1.5">
        {professions.map((x) => (
          <Link
            key={x.id}
            href={`/admin/terms?p=${x.slug}`}
            aria-current={x.id === profession?.id ? "page" : undefined}
            className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-[13px] ${x.id === profession?.id ? "border-accent bg-accent text-accent-fg" : "border-border text-fg hover:border-fg"}`}
          >
            {x.name}
          </Link>
        ))}
      </nav>
      {(Object.keys(byKind) as TermRow["kind"][]).map((kind) => (
        <section key={kind}>
          <h2 className="font-display text-[26px] leading-none text-ink">{KIND_LABELS[kind]}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {byKind[kind].map((term) => (
              <div
                key={term.id}
                className={`flex flex-col gap-2 rounded-[14px] border border-border bg-surface p-3 @[560px]/admin:flex-row @[560px]/admin:items-center @[560px]/admin:justify-between ${
                  !term.active ? "opacity-50" : ""
                }`}
              >
                <div className="flex flex-1 flex-col gap-2 @[560px]/admin:flex-row @[560px]/admin:items-center">
                  <form action={renameTerm.bind(null, term.id)} className="flex items-center gap-2">
                    <input
                      name="name"
                      defaultValue={term.name}
                      className="w-full rounded-[12px] border border-border bg-bg px-2 py-1.5 text-sm text-fg @[560px]/admin:max-w-xs"
                    />
                    <button type="submit" className="shrink-0 text-sm font-medium text-accent">
                      Save
                    </button>
                  </form>
                  {/* The slug trap's deliberate escape hatch — changing this
                      writes term_slug_history so the old URL 301s (see
                      src/lib/supabase/middleware.ts), it never just breaks. */}
                  <form
                    action={changeTermSlug.bind(null, term.id)}
                    className="flex items-center gap-1 text-xs text-muted"
                  >
                    <span>/</span>
                    <input
                      name="slug"
                      defaultValue={term.slug}
                      className="w-32 rounded-[12px] border border-border bg-bg px-2 py-1 text-xs text-fg"
                    />
                    <button type="submit" className="shrink-0 font-medium text-danger" title="Old URL will 301 here">
                      Change slug
                    </button>
                  </form>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm">
                  {kind !== "discipline" && (
                    <form action={setTermProfession.bind(null, term.id)} className="flex items-center gap-1.5">
                      <label className="sr-only" htmlFor={`belongs-${term.id}`}>Belongs to</label>
                      <select id={`belongs-${term.id}`} name="profession_id" defaultValue={term.parent_id ?? ""} className="rounded-[10px] border border-border bg-bg px-2 py-1 text-xs text-fg">
                        <option value="">Every profession</option>
                        {professions.map((x) => (
                          <option key={x.id} value={x.id}>{x.name}</option>
                        ))}
                      </select>
                      <button type="submit" className="text-xs font-medium text-accent">Move</button>
                    </form>
                  )}
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
        <h2 className="font-display text-[26px] leading-none text-ink">Add a term</h2>
        <form action={createTerm} className="mt-3 flex flex-col gap-3 @[560px]/admin:flex-row @[560px]/admin:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-sm font-medium text-fg">Name</span>
            <input
              name="name"
              required
              className="w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-fg"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Kind</span>
            <select
              name="kind"
              className="w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-fg"
            >
              <option value="discipline">Discipline or speciality</option>
              <option value="skill">Skill</option>
              <option value="attribute">Setup</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Belongs to</span>
            <select name="profession_id" defaultValue={profession?.id ?? ""} className="w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-fg">
              <option value="">Every profession (skills and setup only)</option>
              {professions.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </label>
          <Button type="submit">Add</Button>
        </form>
      </section>

      <HistoryList rows={history} />
    </div>
  );
}
