import type { Metadata } from "next";
import Link from "next/link";
import { createPublicSupabase } from "@/lib/supabase/public";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import { getRidersChoiceMinReviews } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site-url";
import { profilePath } from "@/lib/page-paths";

export async function generateMetadata(): Promise<Metadata> {
  const r = await getContent("riders_choice.rules");
  return { title: r.title, description: r.intro, alternates: { canonical: absoluteUrl("/riders-choice") } };
}

/** /riders-choice (stage F): the rules, and every published year's winners. */
export default async function RidersChoicePage() {
  const db = createPublicSupabase();
  const [rules, min, professions, { data }] = await Promise.all([
    getContent("riders_choice.rules"),
    getRidersChoiceMinReviews(),
    getProfessions(),
    db ? db.from("awards").select("year, state, average, reviews, profession_id, providers(name, slug)").not("published_at", "is", null).order("year", { ascending: false }).order("state") : Promise.resolve({ data: [] }),
  ]);
  const rows = (data ?? []) as unknown as { year: number; state: string; average: number; reviews: number; profession_id: string; providers: { name: string; slug: string } }[];
  const years = [...new Set(rows.map((r) => r.year))];
  const name = (id: string) => professions.find((p) => p.id === id)?.name ?? "";
  return (
    <article className="mx-auto max-w-[860px] px-[18px] pb-20 pt-12 wide:px-0 wide:pb-[120px] wide:pt-20">
      <h1 className="text-[46px] leading-[0.98] -tracking-[0.02em] text-ink wide:text-[72px]">{rules.title}</h1>
      <p className="mt-5 text-[18px] leading-[1.55] text-ink">{rules.intro}</p>
      {years.map((y) => (
        <section key={y} className="mt-10" data-award-year={y}>
          <h2 className="text-[30px] leading-[1.1] text-ink">{y}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {rows.filter((r) => r.year === y).map((r) => (
              <li key={`${r.profession_id}${r.state}`} className="rounded-[14px] border border-border bg-surface p-4">
                <p className="text-[12.5px] text-subtle">{name(r.profession_id)}, {r.state}</p>
                <Link href={profilePath(r.providers.slug)} className="font-display text-[22px] leading-[1.1] text-ink hover:text-accent">{r.providers.name}</Link>
                <p className="mt-1 text-[13.5px] text-muted">{Number(r.average).toFixed(1)} out of 5 from {r.reviews} reviews</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="mt-12 flex flex-col gap-7" data-award-rules>
        {rules.sections.map((s) => (
          <div key={s.title}>
            <h2 className="text-[24px] leading-[1.1] text-ink">{s.title}</h2>
            <p className="mt-2 text-[16px] leading-[1.6] text-muted">{fillVariables(s.body, { min_reviews: String(min) })}</p>
          </div>
        ))}
      </section>
    </article>
  );
}
