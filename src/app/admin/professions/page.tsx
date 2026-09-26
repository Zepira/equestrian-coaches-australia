import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProfessionGlyph, hasGlyph } from "@/components/profession-glyph";
import { createClient } from "@/lib/supabase/server";
import { changeLog } from "@/lib/admin";
import { sectionPath } from "@/lib/page-paths";
import { HistoryList } from "../history-list";
import { createProfession, moveProfession } from "./actions";

export const metadata = { title: "Professions" };

const STATE: Record<string, string> = { draft: "Draft", taking_signups: "Taking sign-ups", live: "Live" };

/**
 * /admin/professions (§10, §11): every profession in menu order, with how
 * many people are on each, and the form that adds one. A new one starts as
 * a draft; setting it live is what puts it in the menus, the search, the
 * sitemap and the alerts, with no deploy.
 */
export default async function AdminProfessionsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const [{ data }, { data: tags }] = await Promise.all([
    supabase.from("terms").select("id, slug, name, sort_order, profession_details(door, glyph_key, launch_state)").eq("kind", "profession").order("sort_order"),
    supabase.from("provider_terms").select("term_id, terms!inner(kind)").eq("terms.kind", "profession"),
  ]);
  const count = new Map<string, number>();
  for (const t of tags ?? []) count.set(t.term_id, (count.get(t.term_id) ?? 0) + 1);
  const list = (data ?? []) as unknown as { id: string; slug: string; name: string; profession_details: { door: string; glyph_key: string; launch_state: string } | null }[];
  const history = await changeLog(supabase, { table: ["terms", "profession_details"], rowIds: list.map((p) => p.id) });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Professions</h2>
        <p className="mt-1.5 text-[14px] text-muted">
          In menu order. A draft is seen only here; taking sign-ups lets people join through its pitch page while the section stays hidden; live puts it everywhere.
        </p>
      </div>
      <ol className="flex flex-col gap-2">
        {list.map((p, i) => {
          const d = p.profession_details;
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-[14px] border border-border bg-surface p-3" data-profession={p.slug}>
              {d && hasGlyph(d.glyph_key) && <ProfessionGlyph slug={d.glyph_key} size={26} className="shrink-0 text-accent" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <span className="font-display text-[20px] leading-none text-ink">{p.name}</span>
                  <span className="text-[12px] text-subtle">/{p.slug}</span>
                </div>
                <div className="mt-1 text-[12px] text-subtle">
                  {STATE[d?.launch_state ?? "draft"]} · {d?.door === "coaches" ? "Coaches door" : "Horse care door"} · {count.get(p.id) ?? 0} on it
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-[13px]">
                <form action={moveProfession.bind(null, p.id, "up")}>
                  <button disabled={i === 0} aria-label={`Move ${p.name} up`} className="rounded-[8px] px-2 py-1 text-subtle hover:bg-shade disabled:opacity-30">↑</button>
                </form>
                <form action={moveProfession.bind(null, p.id, "down")}>
                  <button disabled={i === list.length - 1} aria-label={`Move ${p.name} down`} className="rounded-[8px] px-2 py-1 text-subtle hover:bg-shade disabled:opacity-30">↓</button>
                </form>
                {d?.launch_state === "live" && (
                  <Link href={sectionPath(p.slug)} target="_blank" className="hidden text-subtle hover:text-fg @[560px]/admin:inline">View</Link>
                )}
                <Link href={`/admin/professions/${p.id}`} className="font-medium text-accent hover:text-accent-hover">Edit</Link>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[22px] leading-none text-ink">Add a profession</h2>
        <p className="mt-1.5 text-[14px] text-muted">It starts as a draft. You land in its editor to fill in the rest before setting it live.</p>
        {error && <p role="alert" className="mt-3 text-[14px] text-danger">{error}</p>}
        <form action={createProfession} className="mt-3 grid gap-3 @[560px]/admin:grid-cols-[1fr_1fr_auto_auto] @[560px]/admin:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Name, as in the menu</span>
            <input name="name" required maxLength={40} placeholder="Chiropractors" className="w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-fg" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">One of them</span>
            <input name="singular" required maxLength={40} placeholder="chiropractor" className="w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-fg" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Door</span>
            <select name="door" defaultValue="horse_care" className="w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-fg">
              <option value="horse_care">Horse care</option>
              <option value="coaches">Coaches</option>
            </select>
          </label>
          <Button type="submit">Add</Button>
        </form>
      </section>

      <HistoryList rows={history} />
    </div>
  );
}
