import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase/public";
import { RichText } from "@/components/rich-text";
import { SubscribeCard } from "@/components/subscribe-card";

/**
 * /p/[slug] (The Marketing Engine M3): a campaign page for one partner or
 * event (a Pony Club page, an Equitana page), edited under Admin → On the
 * site, each with its own /go/ link. Kept out of search results: it's for
 * the people the link was given to.
 */
type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const db = createPublicSupabase();
  if (!db) return null;
  const { data } = await db.from("landing_pages").select("slug, name, eyebrow, title, body, button_label, button_href, show_alerts").eq("slug", slug).eq("published", true).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await load((await params).slug);
  if (!page) return {};
  return { title: page.title.replace(/\*/g, ""), robots: { index: false, follow: true } };
}

export default async function LandingPage({ params }: Params) {
  const page = await load((await params).slug);
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-[860px] px-[18px] pb-20 pt-12 wide:px-0 wide:pb-[120px] wide:pt-20" data-landing={page.slug}>
      {page.eyebrow && <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">{page.eyebrow}</p>}
      <h1 className="mt-3 text-[46px] leading-[0.98] -tracking-[0.02em] text-ink wide:text-[76px]">
        <RichText text={page.title} emClassName="text-accent" />
      </h1>
      <div className="mt-6 flex max-w-[60ch] flex-col gap-4 text-[17px] leading-[1.55] text-muted wide:text-[19px]">
        {String(page.body)
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((para) => (
            <p key={para}>
              <RichText text={para} emClassName="text-accent" />
            </p>
          ))}
      </div>
      {page.button_label && page.button_href && (
        <Link href={page.button_href} className="mt-8 inline-block rounded-[10px] bg-accent px-6 py-3.5 text-[16px] font-semibold text-accent-fg hover:bg-accent-hover">
          {page.button_label}
        </Link>
      )}
      {page.show_alerts && (
        <div className="mt-12">
          <SubscribeCard heading="Hear when someone good starts near you" what="someone new starts" source={`landing:${page.slug}`} />
        </div>
      )}
    </div>
  );
}
