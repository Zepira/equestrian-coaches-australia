import type { Metadata } from "next";
import Link from "next/link";
import { createServiceSupabase } from "@/lib/supabase/service";
import { getContent } from "@/lib/cms/read";
import { fileUrl, money, phase, type Competition } from "@/lib/competitions";
import { absoluteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const w = await getContent("competitions.words");
  return { title: w.indexTitle, description: w.indexIntro, alternates: { canonical: absoluteUrl("/competitions") } };
}

const LABEL: Record<string, string> = { open: "Open now", upcoming: "Opening soon", closed: "Closed", judged: "Result out" };

/** /competitions (M10): what's open first, then what's coming and what's finished. */
export default async function CompetitionsPage() {
  const service = createServiceSupabase();
  const w = await getContent("competitions.words");
  const { data } = service ? await service.from("competitions").select("*").neq("status", "draft").order("closes_at", { ascending: false }) : { data: [] };
  const order = ["open", "upcoming", "closed", "judged"];
  const list = ((data ?? []) as Competition[]).map((c) => ({ c, p: phase(c) })).sort((a, b) => order.indexOf(a.p) - order.indexOf(b.p));
  return (
    <div className="mx-auto max-w-[1184px] px-[18px] pb-20 pt-12 wide:px-12 wide:pb-[120px] wide:pt-20">
      <h1 className="text-[46px] leading-[0.98] -tracking-[0.02em] text-ink wide:text-[72px]">{w.indexTitle}</h1>
      <p className="mt-4 max-w-[60ch] text-[18px] leading-[1.55] text-muted">{w.indexIntro}</p>
      {list.length === 0 ? (
        <p className="mt-10 text-[15px] text-subtle">{w.none}</p>
      ) : (
        <ul className="mt-10 grid gap-6 min-[640px]:grid-cols-2 wide:grid-cols-3" data-competition-list>
          {list.map(({ c, p }) => (
            <li key={c.id}>
              <Link href={`/competitions/${c.slug}`} className="group flex flex-col gap-3 text-inherit">
                <div className="aspect-[4/3] overflow-hidden rounded-[16px] bg-shade">
                  {c.image_path && service && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl(service, c.image_path)} alt={c.image_alt} className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-accent">{LABEL[p]}</span>
                <h2 className="text-[24px] leading-[1.1] text-ink group-hover:text-accent">{c.title}</h2>
                <p className="text-[15px] leading-[1.5] text-muted">{c.prize} ({money(c.prize_value_cents)})</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
