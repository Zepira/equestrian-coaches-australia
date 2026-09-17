import type { Metadata } from "next";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import { RiseWords } from "@/components/hero";
import { createClient } from "@/lib/supabase/server";
import { getAttributes, getDisciplineContent, getSkills, searchCoaches } from "@/lib/supabase/queries";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { searchMockCoaches } from "@/lib/mock-coaches";
import { toTermOption } from "@/lib/term-options";
import { disciplineImage } from "@/lib/discipline-content";
import { breadcrumbSchema, itemListSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Disciplines",
  description:
    "Every riding discipline with coaches listed on Equestrian Coaches Australia — dressage, Western, liberty, show jumping, eventing, campdrafting and more. Pick yours and search by location.",
};

/**
 * /disciplines — the full list, one card each, built from the `terms` table
 * (name, blurb, photo) so an admin adding a discipline gets a card here and
 * a page under it with no deploy. Counts are real: published coaches (plus
 * the mock roster while it's on) tagged with each discipline.
 */
export default async function DisciplinesIndexPage() {
  const supabase = await createClient();
  const [disciplines, skills, attributes] = await Promise.all([
    getDisciplineContent(supabase),
    getSkills(supabase),
    getAttributes(supabase),
  ]);
  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const all = supabase ? [...(await searchCoaches(supabase, {})), ...searchMockCoaches({})] : placeholderCoaches.map(toCoachCardData);
  const countByName = new Map<string, number>();
  for (const c of all) for (const n of c.disciplineNames) countByName.set(n, (countByName.get(n) ?? 0) + 1);

  const cards = disciplines.map((d) => ({ ...d, count: countByName.get(d.name) ?? 0, image: disciplineImage(d, 800) }));
  const termOptions = disciplines.map(toTermOption);

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Disciplines", url: "/disciplines" },
          ]),
          itemListSchema(cards.map((d) => ({ name: `${d.name} coaches`, url: `/disciplines/${d.slug}` }))),
        ]}
      />

      {/* ── Opening + search ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1184px] px-[18px] pb-10 pt-10 wide:px-12 wide:pb-14 wide:pt-20">
        <p className="fade-in text-[12px] font-medium uppercase tracking-[0.18em] text-subtle wide:tracking-[0.2em]" style={{ animationDelay: "0.05s" }}>
          Disciplines
        </p>
        <div className="wide:grid wide:grid-cols-[1.3fr_1fr] wide:items-end wide:gap-14">
          <h1 className="mt-4 text-[50px] leading-[0.96] -tracking-[0.02em] text-ink wide:mt-6 wide:text-[92px] wide:leading-[0.92] wide:-tracking-[0.03em]">
            <RiseWords words={["Every", "way", "to", "ride,", "one", "search."]} emphasis={[4, 5]} />
          </h1>
          <div className="fade-in mt-5 flex flex-col gap-3 text-[16px] leading-[1.55] text-muted wide:mt-0 wide:pb-3 wide:text-[17px]" style={{ animationDelay: "0.6s" }}>
            <p>
              Coaches list themselves under the disciplines they actually teach, so a search for a liberty coach doesn&rsquo;t hand you a showjumping instructor who once did a clinic. {cards.length} disciplines so far, from bridleless to working equitation.
            </p>
            <p className="text-[14px] text-subtle">
              Missing yours?{" "}
              <a href="mailto:hello@equestriancoaches.au?subject=A%20discipline%20to%20add" className="border-b border-current text-accent hover:text-accent-hover">
                Tell us
              </a>{" "}
              and we&rsquo;ll add it.
            </p>
          </div>
        </div>
        <div className="fade-in mt-8 wide:mt-10" style={{ animationDelay: "0.75s" }}>
          <SearchBar tone="plain" skills={skills.map(toTermOption)} attributes={attributes.map(toTermOption)} disciplineOptions={termOptions} />
        </div>
      </section>

      {/* ── The list ─────────────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] pb-16 wide:px-12 wide:pb-24">
        <div className="flex items-baseline justify-between border-t border-border pt-6 wide:pt-8">
          <h2 className="text-[26px] leading-none text-ink wide:text-[32px]">A to Z</h2>
          <p className="text-[13px] text-subtle wide:text-[14px]">{all.length} coaches across {cards.length} disciplines</p>
        </div>
        <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-9 min-[640px]:grid-cols-2 wide:mt-8 wide:grid-cols-3 wide:gap-x-7 wide:gap-y-12">
          {cards.map((d) => (
            <li key={d.slug}>
              <Link href={`/disciplines/${d.slug}`} className="group block text-inherit">
                <span className="relative block aspect-[4/3] overflow-hidden rounded-[14px] bg-shade wide:rounded-[16px]">
                  <span data-parallax="drift" data-parallax-speed="0.06" data-parallax-max="32" className="parallax-drift absolute inset-0 block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.image.src}
                      alt={d.image.alt}
                      loading="lazy"
                      decoding="async"
                      className="block h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105"
                    />
                  </span>
                  <span className="absolute bottom-3 left-3 rounded-[var(--radius-pill)] bg-ink-deep/82 px-2.5 py-[5px] text-[12px] font-medium text-ink-fg backdrop-blur-[6px]">
                    {d.count} coach{d.count === 1 ? "" : "es"}
                  </span>
                </span>
                <span className="mt-3.5 flex items-baseline justify-between gap-3">
                  <span className="font-display text-[26px] leading-[1.05] text-ink wide:text-[30px]">{d.name}</span>
                  <span aria-hidden className="text-[18px] text-subtle transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent">→</span>
                </span>
                <span className="mt-1.5 block text-[14.5px] leading-[1.5] text-muted wide:text-[15px]">{d.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* ── Coach CTA ────────────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] pb-14 wide:px-12 wide:pb-24">
        <div className="rounded-[16px] bg-ink-deep px-6 py-9 text-ink-fg wide:flex wide:items-center wide:justify-between wide:gap-10 wide:rounded-[20px] wide:px-12 wide:py-12">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-peach">Coaches</p>
            <p className="mt-2 font-display text-[30px] leading-[1.05] wide:text-[40px]">
              Teach something that isn&rsquo;t here yet? <em className="text-peach">List it anyway.</em>
            </p>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.5] text-ink-fg/78 wide:text-[16px]">
              Tag your profile with the disciplines you teach. If one&rsquo;s missing from our list, tell us at signup and it gets its own page.
            </p>
          </div>
          <Link
            href="/for-coaches"
            className="mt-6 inline-block shrink-0 rounded-[10px] bg-accent px-[26px] py-[15px] text-[16px] font-semibold text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover wide:mt-0"
          >
            List your coaching
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
