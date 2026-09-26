import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompetitionEntryForm } from "@/components/competition-entry-form";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { fillVariables, getContent } from "@/lib/cms/read";
import { currentWording } from "@/lib/audience";
import { getBusinessAbn } from "@/lib/settings";
import { fileUrl, longDate, melbourneDateTime, money, phase, termsFor, winnerLine, type Competition } from "@/lib/competitions";
import { absoluteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

async function load(slug: string, preview: boolean) {
  const service = createServiceSupabase();
  if (!service) return null;
  let drafts = false;
  if (preview) {
    const supabase = await createClient();
    drafts = Boolean(supabase && (await supabase.rpc("is_admin")).data);
  }
  const { data } = await service.from("competitions").select("*").eq("slug", slug).maybeSingle();
  const c = data as Competition | null;
  if (!c || (c.status === "draft" && !drafts)) return null;
  return { service, c };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const loaded = await load((await params).slug, Boolean((await searchParams).preview));
  if (!loaded) return {};
  const { c } = loaded;
  return {
    title: c.title,
    description: c.summary || `${c.prize}. Free to enter.`,
    alternates: { canonical: absoluteUrl(`/competitions/${c.slug}`) },
    ...(c.status === "draft" ? { robots: { index: false, follow: false } } : {}),
  };
}

/**
 * /competitions/[slug] (M10): what it is, the entry form while it's open,
 * the winners once judged, and the full terms, always on the page.
 */
export default async function CompetitionPage({ params, searchParams }: Props) {
  const loaded = await load((await params).slug, Boolean((await searchParams).preview));
  if (!loaded) notFound();
  const { service, c } = loaded;
  const p = phase(c);
  const [w, termsBlock, abn, news] = await Promise.all([getContent("competitions.words"), getContent("competitions.terms"), getBusinessAbn(), currentWording(service, "rider_news")]);
  const { data: winners } = p === "judged" ? await service.from("competition_entries").select("name, state, winner_rank").eq("competition_id", c.id).not("winner_rank", "is", null).order("winner_rank") : { data: [] };
  const terms = termsFor(c, abn, termsBlock.sections);

  return (
    <article className="mx-auto max-w-[760px] px-[18px] pb-20 pt-10 wide:px-0 wide:pb-[120px] wide:pt-16" data-competition>
      {c.status === "draft" && <p className="mb-5 rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">Draft preview. Only admins can see this.</p>}
      <p className="text-[13px] text-subtle"><Link href="/competitions" className="text-accent">{w.indexTitle}</Link></p>
      <h1 className="mt-3 text-[42px] leading-[1] -tracking-[0.02em] text-ink wide:text-[60px]">{c.title}</h1>
      {c.summary && <p className="mt-4 text-[19px] leading-[1.5] text-muted">{c.summary}</p>}
      {c.image_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl(service, c.image_path)} alt={c.image_alt} className="mt-7 w-full rounded-[18px] object-cover" />
      )}
      <dl className="mt-7 grid gap-3 text-[15px] sm:grid-cols-2">
        <div className="rounded-[14px] bg-shade p-4"><dt className="text-[12.5px] text-subtle">Prize</dt><dd className="mt-1 text-fg">{c.prize} ({money(c.prize_value_cents)})</dd></div>
        <div className="rounded-[14px] bg-shade p-4"><dt className="text-[12.5px] text-subtle">Entries close</dt><dd className="mt-1 text-fg">{c.closes_at ? melbourneDateTime(c.closes_at) : ""}</dd></div>
      </dl>

      <section className="mt-9 rounded-[18px] border border-border bg-surface p-5 wide:p-6" data-competition-state={p}>
        {p === "judged" ? (
          <>
            <h2 className="text-[26px] leading-[1.1] text-ink">{w.winnersHeading}</h2>
            <ul className="mt-3 flex flex-col gap-1 text-[16px] text-fg" data-winners>
              {(winners ?? []).map((x, i) => <li key={i}>{winnerLine(x.name as string, x.state as string | null)}</li>)}
            </ul>
          </>
        ) : p === "open" ? (
          <>
            <h2 className="text-[26px] leading-[1.1] text-ink">{w.enterHeading}</h2>
            <div className="mt-4">
              <CompetitionEntryForm competitionId={c.id} question={c.question} ageLabel={w.ageLabel} parentLabel={w.parentLabel} sent={w.sent} news={news ? { id: news.id, body: news.body } : null} />
            </div>
          </>
        ) : (
          <p className="text-[15px] text-fg">{p === "upcoming" && c.opens_at ? fillVariables(w.notYet, { opens: melbourneDateTime(c.opens_at) }) : w.closed}{p === "closed" && c.winners_by ? ` The result is out by ${longDate(c.winners_by)}.` : ""}</p>
        )}
      </section>

      <section className="mt-10" data-terms>
        <h2 className="text-[26px] leading-[1.1] text-ink">{w.termsHeading}</h2>
        <div className="mt-4 flex flex-col gap-5">
          {terms.map((t) => (
            <div key={t.title}>
              <h3 className="text-[18px] leading-[1.2] text-ink">{t.title}</h3>
              <p className="mt-1.5 text-[15px] leading-[1.6] text-muted">{t.body}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
