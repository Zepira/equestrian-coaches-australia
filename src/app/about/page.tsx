import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { RiseWords } from "@/components/hero";
import { RichText } from "@/components/rich-text";
import { getContent } from "@/lib/cms/read";

/**
 * /about: why the site exists and how it runs, in the site's own "we". It
 * names nobody who runs it (tone audit, 13 Oct 2026, docs/tone-audit.md):
 * five blocks, every word a content block (about.*, Admin, Pages, About),
 * no photographs. A founder named in copy here is a bug.
 */

export const metadata: Metadata = {
  title: { absolute: "About Equine Professionals Australia" },
  description: "An independent Australian directory of riding coaches and horse care professionals, so finding the right one doesn't come down to luck.",
};

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
  const [opening, why, principles, record, cta] = await Promise.all([
    getContent("about.opening"),
    getContent("about.why"),
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

      {/* ── 2. Why it exists ────────────────────────────────────────────── */}
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

      {/* ── 3. How we do things ────────────────────────────────────────── */}
      <Reveal as="section" className="bg-ink text-ink-fg">
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

      {/* ── 4. Who runs it + we're new ────────────────────────────────── */}
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

      {/* ── 5. CTA ─────────────────────────────────────────────────────── */}
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

