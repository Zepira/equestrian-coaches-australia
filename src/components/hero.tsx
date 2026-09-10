import type { ReactNode } from "react";
import { Parallax } from "@/components/hero-parallax";

/**
 * The Golden Hour hero (canvas: ECA Redesign › 1a, mobile + desktop).
 *
 * Photo drifts with the page (`[data-parallax]`, 0.28 × scrollY capped at
 * 260px) and eases in from 1.08 (`kb`). Over it: the two-layer scrim from
 * the canvas, then the text stack — eyebrow (`fade .1s`), the headline's
 * four words rising one after another (`rise` at .15/.22/.29/.36s), the
 * italic peach discipline word cycling every two seconds (`wordcycle`),
 * the lead (`fade .7s`), the glass search card (`fade .85s`, passed in as
 * children) and, on desktop, the stat row (`fade 1s`). Phones get a
 * bobbing ↓ instead of stats.
 *
 * Layout (heights, padding, column width, type sizes, both scrims) is in
 * `.hero` in globals.css; `wide:` = 1100px is the mobile/desktop switch.
 *
 * `next/image` isn't used: the photo is a hand-built <picture> so the
 * AVIF/WebP ladder in public/hero/ serves the right width, and it is the
 * LCP element (fetchpriority high, eager).
 */

const WIDTHS = [768, 1024, 1280, 1536];
const srcset = (ext: string) => WIDTHS.map((w) => `/hero/wide-${w}.${ext} ${w}w`).join(", ");

const RISE_DELAYS = [0.15, 0.22, 0.29, 0.36, 0.43, 0.5, 0.57, 0.64];

export function RiseWords({ words, emphasis = [] }: { words: string[]; emphasis?: number[] }) {
  return (
    <>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <span className="rise-clip">
            <span
              className={`rise-word${emphasis.includes(i) ? " italic text-peach" : ""}`}
              style={{ animationDelay: `${RISE_DELAYS[i] ?? 0.15 + i * 0.07}s` }}
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

export function Hero({
  eyebrow,
  words,
  cycle,
  lead,
  leadShort,
  children,
  stats,
}: {
  eyebrow: string;
  /** The rising words, e.g. ["Find", "a", "coach", "for"]. */
  words: string[];
  /** The italic peach words that cycle on the second line. */
  cycle: string[];
  lead: string;
  /** Shorter lead for phones; falls back to `lead`. */
  leadShort?: string;
  children?: ReactNode;
  stats?: { value: string; label: string }[];
}) {
  return (
    <section className="hero">
      <Parallax />
      <div className="hero__media" data-parallax>
        <picture>
          <source type="image/avif" srcSet={srcset("avif")} sizes="100vw" />
          <source type="image/webp" srcSet={srcset("webp")} sizes="100vw" />
          <img
            src="/hero/wide-1280.jpg"
            alt=""
            width={1280}
            height={853}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="hero__img"
          />
        </picture>
      </div>
      <div className="hero__scrim" aria-hidden />

      <div className="hero__body">
        <div className="hero__col">
          <p className="hero__eyebrow fade-in" style={{ animationDelay: "0.1s" }}>
            {eyebrow}
          </p>
          <h1 className="hero__h1">
            <RiseWords words={words} />
            <span className="hero__cycle" aria-label={cycle.join(", ")}>
              {cycle.map((w, i) => (
                <span key={w} style={{ animationDelay: `${(0.7 + i * 2).toFixed(1)}s` }} aria-hidden>
                  {w}.
                </span>
              ))}
            </span>
          </h1>
          <p className="hero__lead fade-in" style={{ animationDelay: "0.7s" }}>
            <span className="wide:hidden">{leadShort ?? lead}</span>
            <span className="hidden wide:inline">{lead}</span>
          </p>
          <div className="hero__search fade-in" style={{ animationDelay: "0.85s" }}>
            {children}
          </div>
          <div className="hero__arrow" aria-hidden>
            ↓
          </div>
          {stats && stats.length > 0 && (
            <dl className="hero__stats fade-in" style={{ animationDelay: "1s" }}>
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd>
                    <strong>{s.value}</strong> {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
