import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { DISCIPLINE_CONTENT_COLUMNS } from "@/lib/supabase/queries";
import { disciplineImage, type DisciplineContent } from "@/lib/discipline-content";
import { changeLog } from "@/lib/admin";
import { termPath } from "@/lib/page-paths";
import { HistoryList } from "../history-list";
import { createDiscipline, moveFeatured, setFeatured } from "./actions";

export const metadata = { title: "Specialities and disciplines" };

type Row = DisciplineContent & { featured: boolean; featured_order: number };
type Prof = { id: string; slug: string; name: string; profession_details: { term_noun: string; term_noun_plural: string } | null };

/**
 * /admin/disciplines: one profession's disciplines or specialities at a
 * time (?p=farriers), with what's filled in, and the form that adds one
 * under it. Coaching's featured disciplines (the Coaches menu and the home
 * chips) are picked and ordered here. Admins see hidden rows too.
 */
export default async function AdminDisciplinesPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: profs } = await supabase.from("terms").select("id, slug, name, profession_details(term_noun, term_noun_plural)").eq("kind", "profession").order("sort_order");
  const professions = (profs ?? []) as unknown as Prof[];
  const profession = professions.find((x) => x.slug === (p ?? "coaches")) ?? professions[0];
  if (!profession) return null;
  const noun = profession.profession_details?.term_noun ?? "speciality";
  const nounPlural = profession.profession_details?.term_noun_plural ?? "specialities";
  const isCoaching = profession.slug === "coaches";

  const { data } = await supabase
    .from("terms")
    .select(`${DISCIPLINE_CONTENT_COLUMNS}, featured, featured_order`)
    .eq("kind", "discipline")
    .eq("parent_id", profession.id)
    .order("name");
  const rows = (data ?? []) as unknown as Row[];
  const { data: tagRows } = await supabase.from("provider_terms").select("term_id").in("term_id", rows.map((r) => r.id).concat("00000000-0000-0000-0000-000000000000"));
  const tagged = new Map<string, number>();
  for (const r of tagRows ?? []) tagged.set(r.term_id, (tagged.get(r.term_id) ?? 0) + 1);
  const featured = rows.filter((r) => r.featured).sort((a, b) => a.featured_order - b.featured_order);
  const history = await changeLog(supabase, { table: "terms", rowIds: rows.map((r) => r.id) });

  const Dot = ({ on, label }: { on: boolean; label: string }) => (
    <span className={`inline-flex items-center gap-1 ${on ? "text-fg" : "text-subtle/60"}`} title={on ? `${label}: set` : `${label}: not set`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${on ? "bg-success" : "bg-border"}`} />
      {label}
    </span>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[26px] leading-none text-ink">Specialities and disciplines</h2>
        <nav aria-label="Profession" className="flex flex-wrap gap-1.5">
          {professions.map((x) => (
            <Link
              key={x.id}
              href={`/admin/disciplines?p=${x.slug}`}
              aria-current={x.id === profession.id ? "page" : undefined}
              className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-[13px] ${x.id === profession.id ? "border-accent bg-accent text-accent-fg" : "border-border text-fg hover:border-fg"}`}
            >
              {x.name}
            </Link>
          ))}
        </nav>
        <p className="text-[14px] text-muted">
          Each {noun} is a page at <code className="text-[13px]">/{profession.slug}/[{noun}]</code>. Its address, and the 301 when it changes, are under{" "}
          <Link href="/admin/terms" className="text-accent underline-offset-2 hover:underline">Terms</Link>.
        </p>
      </div>

      {isCoaching && (
        <section className="rounded-[16px] border border-border bg-shade p-4" data-featured>
          <h3 className="font-display text-[20px] leading-none text-ink">Featured</h3>
          <p className="mt-1.5 text-[13px] text-subtle">In the Coaches menu and the home page chips, in this order. Star one below to add it.</p>
          {featured.length === 0 ? (
            <p className="mt-2 text-[14px] text-subtle">None picked, so the site uses its built-in list.</p>
          ) : (
            <ol className="mt-3 flex flex-wrap gap-2">
              {featured.map((d, i) => (
                <li key={d.id} className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-border bg-surface py-1 pl-3 pr-1 text-[14px]">
                  {d.name}
                  <form action={moveFeatured.bind(null, d.id, "up")}><button disabled={i === 0} aria-label={`Move ${d.name} earlier`} className="px-1.5 text-subtle disabled:opacity-30">←</button></form>
                  <form action={moveFeatured.bind(null, d.id, "down")}><button disabled={i === featured.length - 1} aria-label={`Move ${d.name} later`} className="px-1.5 text-subtle disabled:opacity-30">→</button></form>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <ul className="flex flex-col gap-2">
        {rows.length === 0 && <li className="text-[14px] text-subtle">No {nounPlural} yet.</li>}
        {rows.map((d) => {
          const img = disciplineImage(d, 200);
          const n = tagged.get(d.id) ?? 0;
          return (
            <li key={d.id} className={`flex items-center gap-3.5 rounded-[14px] border border-border bg-surface p-3 ${d.active === false ? "opacity-55" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" className="h-14 w-14 shrink-0 rounded-t-[28px] rounded-b-[6px] object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <span className="font-display text-[20px] leading-none text-ink">{d.name}</span>
                  <span className="text-[12px] text-subtle">/{d.slug}</span>
                  {d.active === false && <span className="rounded-[var(--radius-pill)] bg-shade px-2 py-px text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">Hidden</span>}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                  <Dot on={Boolean(d.blurb)} label="Blurb" />
                  <Dot on={Boolean(d.description)} label="Long copy" />
                  <Dot on={img.uploaded} label="Own photo" />
                  <Dot on={Boolean(d.seo_title || d.seo_description)} label="SEO" />
                  <span className="text-subtle">{n} tagged</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-[14px]">
                {isCoaching && (
                  <form action={setFeatured.bind(null, d.id, !d.featured)}>
                    <button aria-label={d.featured ? `Unfeature ${d.name}` : `Feature ${d.name}`} aria-pressed={d.featured} className={d.featured ? "text-accent" : "text-subtle hover:text-fg"} title={d.featured ? "Featured" : "Feature it"}>
                      {d.featured ? "★" : "☆"}
                    </button>
                  </form>
                )}
                <Link href={termPath(profession.slug, d.slug)} target="_blank" className="hidden text-subtle hover:text-fg @[560px]/admin:inline">View</Link>
                <Link href={`/admin/disciplines/${d.id}`} className="font-medium text-accent hover:text-accent-hover">Edit</Link>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[22px] leading-none text-ink">Add a {noun} to {profession.name.toLowerCase()}</h2>
        <p className="mt-1.5 text-[14px] text-muted">Starts as a name and an address; you land in its editor to add the rest. It shows on the site straight away, so add the blurb before you leave.</p>
        <form action={createDiscipline} className="mt-3 flex flex-col gap-3 @[560px]/admin:flex-row @[560px]/admin:items-end">
          <input type="hidden" name="profession_id" value={profession.id} />
          <label className="block flex-1">
            <span className="mb-1 block text-sm font-medium text-fg">Name</span>
            <input name="name" required maxLength={80} className="w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-fg" />
          </label>
          <Button type="submit">Add</Button>
        </form>
      </section>

      <HistoryList rows={history} />
    </div>
  );
}
