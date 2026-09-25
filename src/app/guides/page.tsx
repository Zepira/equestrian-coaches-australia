import type { Metadata } from "next";
import Link from "next/link";
import { createServiceSupabase } from "@/lib/supabase/service";
import { getContent } from "@/lib/cms/read";
import { fileUrl, publishedGuides } from "@/lib/guides";
import { absoluteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const w = await getContent("guides.words");
  return { title: w.indexTitle, description: w.indexIntro, alternates: { canonical: absoluteUrl("/guides") } };
}

/** /guides (M9): every published guide, newest first. */
export default async function GuidesPage() {
  const service = createServiceSupabase();
  const [w, guides] = await Promise.all([getContent("guides.words"), service ? publishedGuides(service) : Promise.resolve([])]);
  return (
    <div className="mx-auto max-w-[1184px] px-[18px] pb-20 pt-12 wide:px-12 wide:pb-[120px] wide:pt-20">
      <h1 className="text-[46px] leading-[0.98] -tracking-[0.02em] text-ink wide:text-[72px]">{w.indexTitle}</h1>
      <p className="mt-4 max-w-[60ch] text-[18px] leading-[1.55] text-muted">{w.indexIntro}</p>
      {guides.length === 0 ? (
        <p className="mt-10 text-[15px] text-subtle">The first guides are being written.</p>
      ) : (
        <ul className="mt-10 grid gap-6 min-[640px]:grid-cols-2 wide:grid-cols-3" data-guide-list>
          {guides.map((g) => (
            <li key={g.id}>
              <Link href={`/guides/${g.slug}`} className="group flex flex-col gap-3 text-inherit">
                <div className="aspect-[4/3] overflow-hidden rounded-[16px] bg-shade">
                  {g.hero_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl(service!, g.hero_path)} alt={g.hero_alt} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
                  )}
                </div>
                <h2 className="text-[24px] leading-[1.1] text-ink group-hover:text-accent">{g.title}</h2>
                <p className="text-[15px] leading-[1.5] text-muted">{g.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
