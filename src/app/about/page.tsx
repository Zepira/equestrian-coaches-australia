import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { RiseWords } from "@/components/hero";
import { RichText } from "@/components/rich-text";
import { getContent } from "@/lib/cms/read";

/**
 * /about: the two people behind the site, and how it runs. Every word is
 * a content block (about.*, edited under Admin → Pages → About); the photos
 * and layout stay here.
 *
 * Copy: "Claude outputs/about-us-copy.md" (draft 2, 16 Sep 2026). Facts the
 * draft left in square brackets are left OUT here rather than guessed at —
 * see PENDING at the bottom of this file. Kim's section is a first-person
 * rewrite of her own site bio and needs her sign-off before launch.
 *
 * Photos: Rosie is Lisa Gordon / Little More Grace Photographics — permission
 * pending, watermark left in place until it's granted. The coach portrait is
 * a stand-in (the /for-coaches Unsplash master) until Kim's garrocha photo
 * (same photographer) is cleared. Both ladders come from
 * scripts/build-hero-images.mjs.
 */

export const metadata: Metadata = {
  title: { absolute: "About Equine Professionals Australia" },
  description: "A rider and a coach built a directory for Australian riding coaches, because finding the right one shouldn't come down to luck.",
};

const srcset = (crop: string, ext: string, widths: number[]) => widths.map((w) => `/hero/${crop}-${w}.${ext} ${w}w`).join(", ");

function FactRail({ facts, dark = false }: { facts: { title: string; body: string }[]; dark?: boolean }) {
  const line = dark ? "border-ink-fg/18" : "border-border";
  const k = dark ? "text-ink-fg/55" : "text-subtle";
  const v = dark ? "text-ink-fg" : "text-ink";
  return (
    <dl className={`grid grid-cols-[auto_1fr] gap-x-5 border-t text-[14px] leading-[1.45] wide:text-[15px] ${line}`}>
      {facts.map(({ title: key, body: val }) => (
        <div key={key} className="contents">
          <dt className={`border-b py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] ${line} ${k} pt-3.5`}>{key}</dt>
          <dd className={`border-b py-2.5 ${line} ${v}`}>{val}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Block text with its *italic* in the accent the section uses. */
function Em({ text, cls }: { text: string; cls: string }) {
  return <RichText text={text} emClassName={cls} strongClassName="font-medium text-ink" />;
}
const inBody = "font-display text-[1.1em] text-ink";

function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <p className={`text-[12px] font-medium uppercase tracking-[0.18em] wide:tracking-[0.2em] ${tone === "dark" ? "text-peach" : "text-accent"}`}>
      {children}
    </p>
  );
}

export default async function AboutPage() {
  const [opening, why, rider, coach, principles, record, cta] = await Promise.all([
    getContent("about.opening"),
    getContent("about.why"),
    getContent("about.rider"),
    getContent("about.coach"),
    getContent("about.principles"),
    getContent("about.record"),
    getContent("about.cta"),
  ]);
  return (
    <div className="about">
      {/* ── 1. Opening ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1184px] px-[18px] pb-12 pt-12 wide:px-12 wide:pb-20 wide:pt-24">
        <p className="fade-in text-[12px] font-medium uppercase tracking-[0.18em] text-subtle wide:tracking-[0.2em]" style={{ animationDelay: "0.05s" }}>
          {opening.eyebrow}
        </p>
        <h1 className="mt-4 max-w-[14ch] text-[50px] leading-[0.96] -tracking-[0.02em] text-ink wide:mt-6 wide:text-[104px] wide:leading-[0.92] wide:-tracking-[0.03em]">
          <RiseWords words={opening.words} emphasis={opening.emphasis} />
        </h1>
        <div className="mt-9 grid gap-6 border-t border-border pt-7 wide:mt-14 wide:grid-cols-[1fr_1fr] wide:gap-14 wide:pt-10">
          <p className="fade-in text-[19px] leading-[1.4] text-ink wide:text-[26px] wide:leading-[1.3]" style={{ animationDelay: "0.7s" }}>
            {opening.lead}
          </p>
          <div className="fade-in flex flex-col gap-4 text-[16px] leading-[1.55] text-muted wide:text-[17px]" style={{ animationDelay: "0.85s" }}>
            {opening.paragraphs.map((t) => (
              <p key={t}>
                <Em text={t} cls={inBody} />
              </p>
            ))}
            <p className="font-medium text-ink">{opening.closing}</p>
          </div>
        </div>
      </section>

      {/* ── 2. Why we built it ─────────────────────────────────────────── */}
      <Reveal as="section" className="bg-ink-deep text-ink-fg">
        <div className="mx-auto max-w-[1184px] px-[18px] py-14 wide:grid wide:grid-cols-[1.1fr_1fr] wide:items-start wide:gap-16 wide:px-12 wide:py-[104px]">
          <div className="wide:sticky wide:top-[100px]">
            <Eyebrow tone="dark">{why.eyebrow}</Eyebrow>
            <h2 className="mt-3 text-[40px] leading-[0.98] -tracking-[0.02em] wide:mt-4 wide:text-[68px] wide:leading-[0.96] wide:-tracking-[0.025em]">
              <Em text={why.title} cls="text-peach" />
            </h2>
          </div>
          <div className="mt-7 flex flex-col gap-5 text-[16px] leading-[1.55] text-ink-fg/82 wide:mt-2 wide:text-[18px]">
            {why.paragraphs.map((t) => (
              <p key={t}>
                <Em text={t} cls="text-peach" />
              </p>
            ))}
            <p className="font-display text-[26px] leading-[1.15] text-ink-fg wide:text-[32px]">
              <Em text={why.pullQuote} cls="text-peach" />
            </p>
            <p>{why.closing}</p>
          </div>
        </div>
      </Reveal>

      {/* ── 3. The rider ───────────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] pt-14 wide:px-12 wide:pt-[104px]">
        <div className="wide:grid wide:grid-cols-[1fr_360px] wide:items-end wide:gap-16">
          <div>
            <Eyebrow>{rider.eyebrow}</Eyebrow>
            <h2 className="mt-3 text-[40px] leading-[0.98] -tracking-[0.02em] text-ink wide:mt-4 wide:text-[68px] wide:leading-[0.96] wide:-tracking-[0.025em]">
              <Em text={rider.title} cls="text-accent" />
            </h2>
            <div className="mt-6 flex max-w-[62ch] flex-col gap-4 text-[16px] leading-[1.55] text-muted wide:mt-8 wide:text-[17px]">
              {rider.paragraphs.map((t) => (
                <p key={t}>
                  <Em text={t} cls={inBody} />
                </p>
              ))}
              <p className="font-medium text-ink">{rider.closing}</p>
              <p className="text-[14px] text-subtle">{rider.signature}</p>
            </div>
          </div>
          <div className="mt-8 wide:mt-0">
            <FactRail facts={rider.facts} />
          </div>
        </div>
        <figure className="relative mt-9 overflow-hidden rounded-[16px] bg-shade wide:mt-14 wide:rounded-[20px]">
          <div className="aspect-[6/5]">
            <picture>
              <source type="image/avif" srcSet={srcset("about-rosie", "avif", [640, 1024, 1400, 1800])} sizes="(min-width: 1280px) 1088px, 100vw" />
              <source type="image/webp" srcSet={srcset("about-rosie", "webp", [640, 1024, 1400, 1800])} sizes="(min-width: 1280px) 1088px, 100vw" />
              <img
                src="/hero/about-rosie-1024.jpg"
                alt="Rosie, a dappled grey mare, standing square in show sashes."
                loading="lazy"
                decoding="async"
                // No parallax drift on this one: the drift scales the photo
                // 1.12× to hide its edges, which clips Rosie's ears and hooves.
                className="block h-full w-full object-cover"
              />
            </picture>
          </div>
          <figcaption className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 wide:bottom-5 wide:left-5">
            <span className="rounded-[var(--radius-pill)] bg-ink-deep/82 px-3 py-1.5 text-[12px] font-medium text-ink-fg backdrop-blur-[6px] wide:px-3.5 wide:text-[13px]">Rosie</span>
            <span className="rounded-[var(--radius-pill)] bg-ink-deep/60 px-3 py-1.5 text-[11px] text-ink-fg/85 backdrop-blur-[6px] wide:text-[12px]">Photo: Lisa Gordon, Little More Grace Photographics</span>
          </figcaption>
        </figure>
      </Reveal>

      {/* ── 4. The coach ───────────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] pt-16 wide:px-12 wide:pt-[120px]">
        <div className="wide:grid wide:grid-cols-[420px_1fr] wide:items-start wide:gap-20">
          <figure className="relative mx-auto max-w-[360px] wide:sticky wide:top-[100px] wide:mx-0 wide:max-w-none">
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[14px] bg-shade">
              <picture>
                <source type="image/avif" srcSet={srcset("about-kim", "avif", [480, 800, 1200])} sizes="(min-width: 1100px) 420px, 90vw" />
                <source type="image/webp" srcSet={srcset("about-kim", "webp", [480, 800, 1200])} sizes="(min-width: 1100px) 420px, 90vw" />
                <img
                  src="/hero/about-kim-800.jpg"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  data-parallax="drift"
                  data-parallax-speed="0.08"
                  data-parallax-max="40"
                  className="parallax-drift block h-full w-full object-cover"
                />
              </picture>
            </div>
            <figcaption className="mt-3 text-[12px] leading-[1.45] text-subtle wide:text-[13px]">
              Kim. <span className="text-subtle/70">Portrait to come — Lisa Gordon, Little More Grace Photographics.</span>
            </figcaption>
          </figure>
          <div className="mt-10 wide:mt-0">
            <Eyebrow>{coach.eyebrow}</Eyebrow>
            <h2 className="mt-3 text-[40px] leading-[0.98] -tracking-[0.02em] text-ink wide:mt-4 wide:text-[68px] wide:leading-[0.96] wide:-tracking-[0.025em]">
              <Em text={coach.title} cls="text-accent" />
            </h2>
            <div className="mt-6 flex max-w-[62ch] flex-col gap-4 text-[16px] leading-[1.55] text-muted wide:mt-8 wide:text-[17px]">
              <p>
                I coach foundational connection, lightness and body feel — the things that sit underneath every discipline, whether you&rsquo;re jumping, doing dressage or riding bridleless in an open paddock.
              </p>
              <p>
                I&rsquo;ve been working with horses for most of my life, and teaching for a good part of it. I work with youngsters through to advanced horses, and with riders from their first lessons through to competition. My specialties are liberty, bridleless riding, classical dressage, showjumping and the transition to bitless, and a lot of what I teach is confidence, biomechanics and mindset as much as it is technique.
              </p>
              <p>
                What I&rsquo;m actually after, in all of it, is a horse and rider who understand each other well enough that the aids stop being instructions and start being a conversation. Bridleless riding is the clearest test of that, but it isn&rsquo;t the point. The point is the partnership that makes it possible.
              </p>
              <p className="text-[14px] text-subtle">— Kim</p>
            </div>
            <div className="mt-8 wide:mt-10">
              <FactRail facts={coach.facts} />
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── 5. How we do things ────────────────────────────────────────── */}
      <Reveal as="section" className="mt-16 bg-ink text-ink-fg wide:mt-[120px]">
        <div className="mx-auto max-w-[1184px] px-[18px] py-14 wide:grid wide:grid-cols-[1fr_1.5fr] wide:items-start wide:gap-16 wide:px-12 wide:py-[104px]">
          <div className="wide:sticky wide:top-[100px]">
            <Eyebrow tone="dark">{principles.eyebrow}</Eyebrow>
            <h2 className="mt-3 text-[40px] leading-[0.98] -tracking-[0.02em] wide:mt-4 wide:text-[64px] wide:leading-[0.96] wide:-tracking-[0.025em]">
              <Em text={principles.title} cls="text-peach" />
            </h2>
            <p className="mt-5 hidden max-w-[36ch] text-[16px] leading-[1.5] text-ink-fg/70 wide:block">{principles.lead}</p>
          </div>
          <ol className="mt-7 flex flex-col border-t border-ink-fg/20 wide:mt-0">
            {principles.items.map((p, i) => (
              <li key={p.title} className="grid grid-cols-[36px_1fr] gap-2.5 border-b border-ink-fg/20 py-5 wide:grid-cols-[52px_1fr] wide:gap-4 wide:py-7">
                <span className="pt-1 font-display text-[22px] italic leading-none text-peach wide:text-[28px]">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-display text-[24px] leading-[1.1] wide:text-[30px]">{p.title}</p>
                  <p className="mt-2 text-[15px] leading-[1.5] text-ink-fg/75 wide:mt-2.5 wide:max-w-[58ch] wide:text-[16px]">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      {/* ── 6. For the record + we're new ──────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] pt-14 wide:px-12 wide:pt-[104px]">
        <div className="grid gap-4 wide:grid-cols-2 wide:gap-6">
          <div className="rounded-[16px] bg-shade px-5 py-6 wide:rounded-[20px] wide:px-9 wide:py-9">
            <Eyebrow>{record.recordEyebrow}</Eyebrow>
            <p className="mt-3 font-display text-[26px] leading-[1.12] text-ink wide:text-[32px]">{record.recordTitle}</p>
            <p className="mt-4 text-[15px] leading-[1.55] text-muted wide:text-[16px]">{record.recordBody}</p>
          </div>
          <div className="rounded-[16px] border border-border bg-surface px-5 py-6 wide:rounded-[20px] wide:px-9 wide:py-9">
            <Eyebrow>{record.newEyebrow}</Eyebrow>
            <p className="mt-3 font-display text-[26px] leading-[1.12] text-ink wide:text-[32px]">{record.newTitle}</p>
            <p className="mt-4 text-[15px] leading-[1.55] text-muted wide:text-[16px]">{record.newBody}</p>
            <a href={`mailto:${record.email}`} className="mt-5 inline-block border-b border-current text-[15px] font-medium text-accent hover:text-accent-hover wide:text-[16px]">
              {record.email}
            </a>
          </div>
        </div>
      </Reveal>

      {/* ── 7. CTA ─────────────────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] py-14 wide:px-12 wide:py-[104px]">
        <div className="relative overflow-hidden rounded-[16px] bg-ink-deep px-6 py-10 text-center text-ink-fg wide:rounded-[24px] wide:px-12 wide:py-20">
          <p className="mx-auto font-display text-[36px] leading-[1.02] -tracking-[0.02em] wide:max-w-[20ch] wide:text-[64px] wide:leading-none wide:-tracking-[0.025em]">
            <Em text={cta.title} cls="text-peach" />
          </p>
          <div className="mx-auto mt-8 grid max-w-[560px] gap-3 wide:mt-10 wide:grid-cols-2">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-fg/55">{cta.ridersLabel}</span>
              <Link href="/search" className="block w-full rounded-[10px] bg-accent px-[26px] py-[15px] text-[16px] font-semibold text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover">
                {cta.ridersButton}
              </Link>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-fg/55">{cta.coachesLabel}</span>
              <Link href="/for-coaches" className="block w-full rounded-[10px] border border-ink-fg/40 px-[26px] py-3.5 text-[16px] font-medium text-ink-fg transition-colors duration-[250ms] hover:bg-ink-fg/10">
                {cta.coachesButton}
              </Link>
            </div>
          </div>
          <p className="mt-7 text-[14px] text-ink-fg/60 wide:mt-9 wide:text-[15px]">
            {cta.contactLine}{" "}
            <a href={`mailto:${record.email}`} className="border-b border-current text-peach hover:text-ink-fg">
              {record.email}
            </a>
          </p>
        </div>
      </Reveal>
    </div>
  );
}

/*
 * PENDING — facts the copy draft left blank, deliberately not invented here.
 * Kim: years with horses / years teaching; which countries the international
 * work covers (left out until backed — "international" unbacked reads as a
 * claim); where she's based and travel radius; what she rides now; the horse
 * that changed how she teaches; whether to list qualifications; coach vs
 * trainer vs instructor; whether "animal communicator" goes here or on her
 * profile (recommendation in the copy notes: profile only). Alana: launch
 * month/year for the "we're new" card; the partnership entity name once ASIC
 * registration is through. Both photos: written permission from Lisa Gordon.
 */
