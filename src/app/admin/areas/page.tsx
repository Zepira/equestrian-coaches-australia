import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { changeLog } from "@/lib/admin";
import { areaPagePath } from "@/lib/page-paths";
import { Button } from "@/components/ui/button";
import { HistoryList } from "../history-list";
import { saveAreaIntro } from "./actions";

export const metadata = { title: "Areas" };

type Area = { id: string; slug: string; name: string; state: string };

/**
 * /admin/areas (§05.2, §10): the hand-written intro on a profession's page
 * for a place, like /farriers/in/bendigo-vic. Templated intros are what
 * Google's 2024 update penalised, so these are written only for the pages
 * worth it: local clubs, grounds, what the area is known for. The pages
 * that exist today are listed first; any place can be picked by search.
 */
export default async function AdminAreasPage({ searchParams }: { searchParams: Promise<{ q?: string; area?: string; p?: string; saved?: string }> }) {
  const { q = "", area: areaId, p, saved } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;

  const clean = q.trim().replace(/[%,()]/g, "");
  const [{ data: profs }, { data: found }, { data: eligible }, { data: intros }] = await Promise.all([
    supabase.from("terms").select("id, slug, name").eq("kind", "profession").order("sort_order"),
    clean ? supabase.from("areas").select("id, slug, name, state").ilike("name", `${clean}%`).order("name").limit(20) : Promise.resolve({ data: [] as Area[] }),
    supabase.from("indexable_pages").select("provider_count, profession_id, areas(id, slug, name, state)").eq("eligible", true).is("term_id", null).order("provider_count", { ascending: false }).limit(30),
    supabase.from("area_intros").select("area_id, profession_id, body, areas(slug, name, state)"),
  ]);
  const professions = profs ?? [];
  const profession = professions.find((x) => x.slug === p) ?? professions[0];
  const { data: picked } = areaId ? await supabase.from("areas").select("id, slug, name, state").eq("id", areaId).maybeSingle() : { data: null };
  const current = (intros ?? []).find((i) => i.area_id === picked?.id && i.profession_id === profession?.id)?.body ?? "";
  const history = await changeLog(supabase, { table: "area_intros" });
  const nameOf = (id: string) => professions.find((x) => x.id === id)?.name ?? "";
  const pick = (a: Area, profSlug = profession?.slug) => `/admin/areas?area=${a.id}&p=${profSlug}`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Areas</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          A short intro, written by hand, at the top of a profession&rsquo;s page for a place: the grounds, clubs and what riders there look for. About 150 words. Leave a page without one rather than write something generic.
        </p>
      </div>

      {picked && profession ? (
        <section className="rounded-[16px] border border-border bg-surface p-4 @[560px]/admin:p-5" data-area-editor>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-[22px] leading-none text-ink">
              {profession.name} in {picked.name}, {picked.state}
            </h3>
            <Link href={areaPagePath({ professionSlug: profession.slug, areaSlug: picked.slug })} target="_blank" className="text-[13px] text-accent underline-offset-2 hover:underline">
              {areaPagePath({ professionSlug: profession.slug, areaSlug: picked.slug })}
            </Link>
          </div>
          <nav aria-label="Profession" className="mt-3 flex flex-wrap gap-1.5">
            {professions.map((x) => (
              <Link key={x.id} href={pick(picked, x.slug)} aria-current={x.id === profession.id ? "page" : undefined} className={`rounded-[var(--radius-pill)] border px-3 py-1 text-[13px] ${x.id === profession.id ? "border-accent bg-accent text-accent-fg" : "border-border text-fg"}`}>
                {x.name}
              </Link>
            ))}
          </nav>
          {saved && <p role="status" className="mt-3 text-[14px] text-success">Saved. It&rsquo;s on the page now.</p>}
          <form action={saveAreaIntro.bind(null, picked.id, profession.id)} className="mt-3 flex flex-col gap-3">
            <label className="block">
              <span className="mb-1 block text-[14px] font-medium text-fg">Intro</span>
              <textarea name="body" defaultValue={current} rows={8} maxLength={3000} className="w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-[15px] leading-[1.55] text-fg" />
              <span className="mt-1 block text-[12px] text-subtle">A blank line starts a new paragraph. Empty it and save to take the intro off. The page only exists once enough {profession.name.toLowerCase()} are there, so it can wait until then.</span>
            </label>
            <div><Button type="submit">Save</Button></div>
          </form>
        </section>
      ) : null}

      <div className="grid gap-6 @[560px]/admin:grid-cols-2">
        <section>
          <h3 className="text-[15px] font-semibold text-fg">Area pages on the site now</h3>
          {(eligible ?? []).length === 0 ? (
            <p className="mt-1 text-[14px] text-subtle">None yet: a place gets its page once enough people in one profession are there.</p>
          ) : (
            <ul className="mt-2 text-[14px]">
              {(eligible ?? []).map((e, i) => {
                const a = e.areas as unknown as Area;
                const prof = professions.find((x) => x.id === e.profession_id);
                return (
                  <li key={i} className="flex justify-between border-b border-border py-1.5">
                    <Link href={pick(a, prof?.slug)} className="text-fg hover:text-accent">{prof?.name} in {a.name}, {a.state}</Link>
                    <span className="text-muted">{e.provider_count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section>
          <h3 className="text-[15px] font-semibold text-fg">Find a place</h3>
          <form className="mt-2 flex gap-2" role="search">
            <input name="q" defaultValue={q} placeholder="Bendigo" aria-label="Place name" className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-fg" />
            {p && <input type="hidden" name="p" value={p} />}
            <button className="rounded-[var(--radius-pill)] bg-ink px-4 text-[14px] text-ink-fg">Find</button>
          </form>
          <ul className="mt-2 text-[14px]">
            {((found ?? []) as Area[]).map((a) => (
              <li key={a.id} className="border-b border-border py-1.5">
                <Link href={pick(a)} className="text-fg hover:text-accent">{a.name}, {a.state}</Link>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 text-[15px] font-semibold text-fg">Written so far</h3>
          {(intros ?? []).length === 0 ? (
            <p className="mt-1 text-[14px] text-subtle">None yet.</p>
          ) : (
            <ul className="mt-2 text-[14px]">
              {(intros ?? []).map((i) => {
                const a = i.areas as unknown as { slug: string; name: string; state: string };
                return (
                  <li key={`${i.area_id}:${i.profession_id}`} className="border-b border-border py-1.5">
                    <Link href={pick({ id: i.area_id, ...a }, professions.find((x) => x.id === i.profession_id)?.slug)} className="text-fg hover:text-accent">
                      {nameOf(i.profession_id)} in {a.name}, {a.state}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <HistoryList rows={history} />
    </div>
  );
}
