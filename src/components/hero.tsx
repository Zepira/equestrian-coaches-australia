import type { ReactNode } from "react";

/**
 * Full-bleed hero with an art-directed background photograph.
 * Layout, scrim and type scale all live in `.hero` in src/app/globals.css.
 *
 * The `<picture>` below is real art direction, not just a resolution ladder:
 * each `<source>` serves a *different crop*, because the horse leaves frame
 * if you centre-crop one wide photo down to a phone. `next/image` cannot do
 * this — it always renders exactly one `<img>` with no per-breakpoint crop —
 * so this is hand-built markup pointed at the files
 * `scripts/build-hero-images.mjs` generates.
 *
 * Source order matters: the browser takes the FIRST `<source>` whose `media`
 * and `type` both match, so the widest-condition crop is listed first and the
 * formats run most-efficient-first (AVIF → WebP → the `<img>` JPEG fallback).
 * The media conditions mirror the `.hero` layout switch exactly.
 */

const OVERLAY =
  "(min-width: 1100px), (min-width: 600px) and (max-height: 899px)";
const BAND_WIDE = "(min-width: 600px)";

function srcset(crop: string, widths: number[], ext: string) {
  return widths.map((w) => `/hero/${crop}-${w}.${ext} ${w}w`).join(", ");
}

const CROPS = {
  wide: [768, 1024, 1280, 1536],
  bandWide: [640, 1024, 1360, 1720],
  bandNarrow: [400, 600, 828, 1140],
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
      <div className="hero__media">
        <picture>
          <source
            media={OVERLAY}
            type="image/avif"
            srcSet={srcset("wide", CROPS.wide, "avif")}
            sizes="100vw"
          />
          <source
            media={OVERLAY}
            type="image/webp"
            srcSet={srcset("wide", CROPS.wide, "webp")}
            sizes="100vw"
          />

          <source
            media={BAND_WIDE}
            type="image/avif"
            srcSet={srcset("band-wide", CROPS.bandWide, "avif")}
            sizes="100vw"
          />
          <source
            media={BAND_WIDE}
            type="image/webp"
            srcSet={srcset("band-wide", CROPS.bandWide, "webp")}
            sizes="100vw"
          />

          <source
            type="image/avif"
            srcSet={srcset("band-narrow", CROPS.bandNarrow, "avif")}
            sizes="100vw"
          />
          <source
            type="image/webp"
            srcSet={srcset("band-narrow", CROPS.bandNarrow, "webp")}
            sizes="100vw"
          />

          {/* Plain <img>, deliberately: next/image renders a single <img> and
              cannot switch crops per breakpoint. See the note at the top of
              this file. */}
          <img
            src="/hero/band-narrow-828.jpg"
            alt={alt ?? ""}
            width={828}
            height={501}
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
      </div>
    </section>
  );
}
