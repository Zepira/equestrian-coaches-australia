import type { ReactNode } from "react";
import { HeroParallax } from "@/components/hero-parallax";
import { CountUp } from "@/components/count-up";

/**
 * Full-bleed hero with an art-directed background photograph.
 * Layout, scrim and type scale all live in `.hero` in src/app/globals.css.
 *
 * One crop at every width now — the "wide" overlay crop (horse pinned hard
 * right, sky and treeline clear across the top for the floating header).
 * This used to be three crops (`wide`/`bandWide`/`bandNarrow`) switched by
 * `media` for a phone-only "band" layout; unified along with `.hero` itself,
 * see the doc comment there. `next/image` can't do even this one crop's
 * responsive-but-art-directed job on its own (no per-breakpoint crop prop),
 * so this stays hand-built markup pointed at the files
 * `scripts/build-hero-images.mjs` generates.
 *
 * Source order: AVIF before WebP before the `<img>` JPEG fallback — the
 * browser takes the first `<source>` whose `type` it can decode.
 */

function srcset(crop: string, widths: number[], ext: string) {
  return widths.map((w) => `/hero/${crop}-${w}.${ext} ${w}w`).join(", ");
}

const CROPS = {
  wide: [768, 1024, 1280, 1536],
};

export function Hero({
  eyebrow,
  title,
  lead,
  children,
  stats,
  alt,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  /** The search form, or whatever the hero's primary action is. */
  children?: ReactNode;
  stats?: { value: string; label: string }[];
  /** Describe the photo only if it carries meaning the headline doesn't.
   *  A decorative hero photo behind a real `<h1>` takes `alt=""`. */
  alt?: string;
}) {
  return (
    <section className="hero">
      <HeroParallax />
      <div className="hero__media">
        <picture>
          <source type="image/avif" srcSet={srcset("wide", CROPS.wide, "avif")} sizes="100vw" />
          <source type="image/webp" srcSet={srcset("wide", CROPS.wide, "webp")} sizes="100vw" />

          {/* Plain <img>, deliberately: next/image renders a single <img> and
              has no per-breakpoint crop prop. See the note at the top of
              this file. */}
          <img
            src="/hero/wide-1280.jpg"
            alt={alt ?? ""}
            width={1280}
            height={853}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="hero__img"
          />
        </picture>
        <div className="hero__scrim" />
      </div>

      <div className="hero__body">
        <div className="hero__inner">
          <div className="hero__col">
            <p className="hero__eyebrow">{eyebrow}</p>
            <h1 className="hero__h1">{title}</h1>
            <p className="hero__lead">{lead}</p>
            {children}
            {stats && stats.length > 0 && (
              <dl className="hero__stats">
                {stats.map((s) => {
                  const numeric = /^\d+$/.test(s.value);
                  return (
                    <div key={s.label}>
                      <dt className="sr-only">{s.label}</dt>
                      <dd>
                        <strong>{numeric ? <CountUp value={Number(s.value)} /> : s.value}</strong> {s.label}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
