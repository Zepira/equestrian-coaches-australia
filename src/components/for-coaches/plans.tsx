"use client";

import Link from "next/link";
import { useState } from "react";

export type Tier = {
  key: string;
  name: string;
  monthly: string;
  yearly: string;
  tagline: string;
  summary: string;
  cta: string;
  featured?: boolean;
};
export type ComparisonRow = { label: string; listed: boolean; spotlight: boolean; clinic: boolean };

/**
 * "Pick a plan" (canvas 2a/2b): a Monthly / Yearly toggle pill that flips
 * every price and its alt line ("a month · or $99/yr" ⇄ "a year · or
 * $9.99/mo"), three tier cards (Spotlight is the ink card with the peach
 * "Most popular" label and terracotta button), the two-sentence note, and
 * the full comparison — a table on desktop, folded away behind "Full
 * comparison, all N features" on phones.
 */
export function Plans({ tiers, rows }: { tiers: Tier[]; rows: ComparisonRow[] }) {
  const [yearly, setYearly] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const on = "bg-ink text-ink-fg";
  const off = "bg-transparent text-ink";

  const toggle = (
    <div className="inline-flex shrink-0 rounded-[var(--radius-pill)] border border-border bg-shade p-[3px] wide:p-1" role="group" aria-label="Billing period">
      <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)} className={`rounded-[var(--radius-pill)] px-3 py-2 text-[13px] font-medium wide:px-[18px] wide:py-2.5 wide:text-[14px] ${yearly ? off : on}`}>
        Monthly
      </button>
      <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)} className={`rounded-[var(--radius-pill)] px-3 py-2 text-[13px] font-medium wide:px-[18px] wide:py-2.5 wide:text-[14px] ${yearly ? on : off}`}>
        <span className="wide:hidden">Yearly</span>
        <span className="hidden wide:inline">Yearly · save two months</span>
      </button>
    </div>
  );

  const mark = (v: boolean) => (
    <span className={v ? "text-accent" : "text-[#c9bfae]"} aria-label={v ? "Included" : "Not included"}>
      {v ? "✓" : "—"}
    </span>
  );

  return (
    <section id="plans" className="mx-auto max-w-[1184px] px-[18px] pt-14 wide:px-12 wide:pt-[88px]">
      <div className="flex items-end justify-between gap-3 wide:gap-6">
        <div>
          <h2 className="text-[38px] leading-none -tracking-[0.02em] text-ink wide:text-[64px] wide:leading-[0.98] wide:-tracking-[0.025em]">Pick a plan</h2>
          <p className="mt-3 hidden max-w-[62ch] text-[17px] leading-[1.5] text-muted wide:mt-4 wide:block">
            Annual is ten months&rsquo; price. Change plan any time, both directions — a coach running a clinic in March goes up for March and back down in April.
          </p>
        </div>
        {toggle}
      </div>
      <p className="mt-3 text-[15px] leading-[1.5] text-muted wide:hidden">
        Annual is ten months&rsquo; price. Change plan any time, both directions — a coach running a clinic in March goes up for March and back down in April.
      </p>

      <div className="mt-6 flex flex-col gap-3 wide:mt-11 wide:grid wide:grid-cols-3 wide:items-stretch wide:gap-4">
        {tiers.map((t) => {
          const f = Boolean(t.featured);
          return (
            <div
              key={t.key}
              data-tier={t.key}
              className={`flex flex-col rounded-[16px] border px-5 py-[22px] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] wide:rounded-[18px] wide:px-7 wide:py-8 wide:hover:-translate-y-1.5 ${f ? "border-ink bg-ink text-ink-fg" : "border-border bg-surface text-fg"}`}
            >
              <div className="flex items-baseline justify-between gap-2.5">
                <div className="font-display text-[30px] leading-none wide:text-[36px]">{t.name}</div>
                {f && <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-peach">Most popular</span>}
              </div>
              <div className="mt-1 text-[14px] opacity-75 wide:mt-1.5 wide:text-[15px]">{t.tagline}</div>
              <div className="mt-4 flex items-baseline gap-2 wide:mt-6">
                <span className="font-display text-[40px] leading-none wide:text-[52px] wide:-tracking-[0.02em]" data-price>
                  {yearly ? t.yearly : t.monthly}
                </span>
                <span className="text-[14px] opacity-75" data-alt>
                  {yearly ? `a year · or ${t.monthly}/mo` : `a month · or ${t.yearly}/yr`}
                </span>
              </div>
              <p className="mt-3.5 text-[14.5px] leading-[1.5] opacity-85 wide:mt-[18px] wide:flex-1 wide:text-[15px]">{t.summary}</p>
              <Link
                href={`/signup?role=coach&plan=${t.key}`}
                className={`mt-[18px] block rounded-[10px] border py-3.5 text-center text-[15px] font-semibold transition-colors duration-[250ms] wide:mt-6 wide:py-[15px] ${
                  f ? "border-accent bg-accent text-accent-fg hover:bg-accent-hover" : "border-ink bg-transparent text-ink hover:bg-shade"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[14px] leading-[1.5] text-muted wide:mt-5 wide:text-center wide:text-[15px]">
        Listed comes with everything a coach needs to be found and reached — it isn&rsquo;t a cut-down plan. Travel radius is the same on every tier, not a paid feature.
      </p>

      {/* phones: folded comparison */}
      <div id="plan-comparison-fold" className="wide:hidden">
        <button
          type="button"
          aria-expanded={compareOpen}
          aria-controls="plan-comparison"
          onClick={() => setCompareOpen((v) => !v)}
          className="mt-5 flex w-full items-center justify-between rounded-[12px] border border-border bg-surface px-[18px] py-4 text-[16px] font-medium text-ink"
        >
          <span>Full comparison, all {rows.length} features</span>
          <span aria-hidden className="text-[18px]">{compareOpen ? "−" : "+"}</span>
        </button>
        {compareOpen && (
          <div id="plan-comparison" className="mt-2 overflow-hidden rounded-[12px] border border-border bg-surface">
            <div className="grid grid-cols-[1fr_46px_46px_46px] border-b border-border bg-shade py-2.5 pl-3.5 pr-1.5 font-display text-[14px] text-ink">
              <span>Feature</span>
              <span className="text-center">Listed</span>
              <span className="text-center text-accent">Spot.</span>
              <span className="text-center">Clinic</span>
            </div>
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[1fr_46px_46px_46px] items-center border-b border-shade py-2.5 pl-3.5 pr-1.5 text-[13.5px] leading-[1.35] text-fg">
                <span>{r.label}</span>
                <span className="text-center">{mark(r.listed)}</span>
                <span className="bg-accent/6 py-2.5 text-center">{mark(r.spotlight)}</span>
                <span className="text-center">{mark(r.clinic)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* desktop: full table */}
      <div className="mt-14 hidden overflow-hidden rounded-[16px] border border-border bg-surface wide:block" role="table" aria-label="Plan comparison">
        <div className="grid grid-cols-[1fr_160px_160px_160px] border-b border-border bg-shade px-7 py-[18px] font-display text-[20px] text-ink" role="row">
          <span role="columnheader">Feature</span>
          <span role="columnheader" className="text-center">Listed</span>
          <span role="columnheader" className="text-center text-accent">Spotlight</span>
          <span role="columnheader" className="text-center">Clinic</span>
        </div>
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[1fr_160px_160px_160px] items-stretch border-b border-shade text-[15px] leading-[1.4] text-fg" role="row">
            <span role="cell" className="px-7 py-3.5">{r.label}</span>
            <span role="cell" className="py-3.5 text-center">{mark(r.listed)}</span>
            <span role="cell" className="bg-accent/6 py-3.5 text-center">{mark(r.spotlight)}</span>
            <span role="cell" className="py-3.5 text-center">{mark(r.clinic)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
