import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Markdown } from "@/components/markdown";
import { CoachCard } from "@/components/coach-card";
import { SubscribeCard } from "@/components/subscribe-card";
import { GuideDownloadForm } from "@/components/guide-download-form";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { searchProviders } from "@/lib/supabase/queries";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import { coauthor, fileUrl, guideBySlug } from "@/lib/guides";
import { breadcrumbSchema } from "@/lib/structured-data";
import { absoluteUrl } from "@/lib/site-url";
import { profilePath, sectionPath } from "@/lib/page-paths";
import { SponsorSlot } from "@/components/sponsor-slot";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

/** Drafts show only to an admin, with ?preview=1. */
async function load(slug: string, preview: boolean) {
  const service = createServiceSupabase();
  if (!service) return null;
  let drafts = false;
  if (preview) {
    const supabase = await createClient();
    drafts = Boolean(supabase && (await supabase.rpc("is_admin")).data);
  }
  const guide = await guideBySlug(service, slug, drafts);
  return guide ? { service, guide } : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await load(slug, Boolean((await searchParams).preview));
  if (!loaded) return {};
  const { guide: g, service } = loaded;
  const url = absoluteUrl(`/guides/${g.slug}`);
  return {
    title: g.seo_title || g.title,
    description: g.seo_description || g.summary,
    alternates: { canonical: url },
    ...(g.status !== "published" ? { robots: { index: false, follow: false } } : {}),
    openGraph: { type: "article", url, title: g.seo_title || g.title, description: g.seo_description || g.summary, ...(g.hero_path ? { images: [fileUrl(service, g.hero_path)] } : {}) },
  };
}

/**
 * /guides/[slug] (M9): the article, who wrote it (and the listed
 * professional who wrote it with us), professionals near the guide's place
 * in its profession, the download if it has one, and the subscribe card.
 */
export default async function GuidePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const loaded = await load(slug, Boolean((await searchParams).preview));
  if (!loaded) notFound();
  const { guide: g, service } = loaded;
  const [w, professions, co, area] = await Promise.all([
    getContent("guides.words"),
    getProfessions(),
    coauthor(service, g.coauthor_provider_id),
    g.area_id ? service.from("areas").select("name, state, lat, long").eq("id", g.area_id).maybeSingle().then((r) => r.data) : Promise.resolve(null),
  ]);
  const profession = professions.find((p) => p.id === g.profession_id) ?? null;
  const supabase = (await createClient()) ?? service;
  const related = (
    await searchProviders(supabase, profession?.id ? [profession.id] : professions.map((p) => p.id).filter((x): x is string => Boolean(x)), {
      lat: area?.lat ?? undefined,
      long: area?.long ?? undefined,
      radiusKm: area ? 100 : undefined,
      includeRemote: false,
    })
  ).slice(0, 4);
  const url = absoluteUrl(`/guides/${g.slug}`);
  const hero = g.hero_path ? fileUrl(service, g.hero_path) : null;
  const date = g.published_at ?? g.updated_at;

  return (
    <article className="mx-auto max-w-[760px] px-[18px] pb-20 pt-10 wide:px-0 wide:pb-[120px] wide:pt-16" data-guide>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.title,
            description: g.summary,
            url,
            datePublished: g.published_at ?? undefined,
            dateModified: g.updated_at,
            ...(hero ? { image: hero } : {}),
            author: [
              ...(g.author_name ? [{ "@type": "Person", name: g.author_name }] : []),
              ...(co ? [{ "@type": "Person", name: co.name, url: absoluteUrl(profilePath(co.slug)) }] : []),
            ],
            publisher: { "@type": "Organization", name: "Equine Professionals Australia", url: absoluteUrl("/") },
          },
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: w.indexTitle, url: "/guides" },
            { name: g.title, url: `/guides/${g.slug}` },
          ]),
        ]}
      />
      {g.status !== "published" && <p className="mb-5 rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">Draft preview. Only admins can see this.</p>}
      <p className="text-[13px] text-subtle">
        <Link href="/guides" className="text-accent">{w.indexTitle}</Link>
        {profession && <> · <Link href={sectionPath(profession.slug)} className="text-accent">{profession.name}</Link></>}
      </p>
      <h1 className="mt-3 text-[42px] leading-[1] -tracking-[0.02em] text-ink wide:text-[60px]">{g.title}</h1>
      {g.summary && <p className="mt-4 text-[19px] leading-[1.5] text-muted">{g.summary}</p>}
      <p className="mt-4 text-[13.5px] text-subtle">
        {[g.author_name, co ? fillVariables(w.coauthor, { name: co.name }) : "", new Date(date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Melbourne" })].filter(Boolean).join(" · ")}
      </p>
      {hero && (
        <figure className="mt-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero} alt={g.hero_alt} className="w-full rounded-[18px] object-cover" />
          {g.hero_credit && <figcaption className="mt-2 text-[12.5px] text-subtle">{g.hero_credit}</figcaption>}
        </figure>
      )}
      <div className="mt-4" data-guide-body><Markdown source={g.body} /></div>
      <SponsorSlot placement="guide" guideId={g.id} className="mt-10" />

      {co && (
        <Link href={profilePath(co.slug)} className="mt-10 flex items-center gap-4 rounded-[18px] border border-border bg-surface p-4 text-inherit hover:border-accent" data-coauthor>
          {co.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={co.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          )}
          <span>
            <span className="block text-[12.5px] text-subtle">{fillVariables(w.coauthor, { name: "" }).trim()}</span>
            <span className="block font-display text-[22px] leading-none text-ink">{co.name}</span>
            {co.headline && <span className="mt-1 block text-[14px] text-muted">{co.headline}</span>}
          </span>
        </Link>
      )}

      {g.download_path && (
        <GuideDownloadForm
          guideId={g.id}
          heading={fillVariables(w.downloadHeading, { download_title: g.download_title || "file" })}
          lead={w.downloadLead}
        />
      )}

      {related.length > 0 && (
        <section className="mt-12" data-guide-related>
          <h2 className="text-[28px] leading-[1.1] text-ink">{profession ? fillVariables(w.related, { plural: profession.plural.toLowerCase() }) : w.relatedAny}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 wide:grid-cols-4">
            {related.map((c) => <CoachCard key={c.slug} coach={c} />)}
          </div>
        </section>
      )}

      <div className="mt-12">
        <SubscribeCard
          heading={profession ? `Hear when ${/^[aeiou]/i.test(profession.singular) ? "an" : "a"} ${profession.singular} starts near you` : "Hear when someone good starts near you"}
          what={profession ? `a new ${profession.singular} starts` : "someone new starts"}
          professionId={profession?.id ?? null}
          door={profession?.door ?? null}
          place={area ? `${area.name} ${area.state}` : null}
          source={`guide:${g.slug}`}
        />
      </div>
    </article>
  );
}
