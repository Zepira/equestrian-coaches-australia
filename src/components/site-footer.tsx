import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { CONTACT_EMAIL } from "@/lib/site-url";

const columns = [
  {
    heading: "Find",
    links: [
      { href: "/search", label: "Riding coaches" },
      { href: "/horse-care", label: "Horse care" },
      { href: "/coaches#disciplines", label: "Disciplines" },
      { href: "/account", label: "My account" },
    ],
  },
  {
    heading: "Professionals",
    links: [
      { href: "/list-your-business", label: "List your business" },
      { href: "/for-coaches", label: "Pricing" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    heading: "About",
    links: [
      { href: "/about", label: "About us" },
      { href: "/login", label: "Log in" },
      { href: `mailto:${CONTACT_EMAIL}`, label: "Contact" },
    ],
    desktopOnly: true,
  },
];

/** The coaches stage's columns: only pages that are open. */
const COACH_STAGE_COLUMNS = [
  {
    heading: "Professionals",
    links: [
      { href: "/list-your-business", label: "List your business" },
      { href: "/for-coaches", label: "For coaches" },
      { href: "/for-professionals", label: "For professionals" },
      { href: "/dashboard", label: "Dashboard" },
    ],
    desktopOnly: false,
  },
  {
    heading: "About",
    links: [
      { href: "/about", label: "About us" },
      { href: "/login", label: "Log in" },
      { href: `mailto:${CONTACT_EMAIL}`, label: "Contact" },
    ],
    desktopOnly: false,
  },
];

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/refunds", label: "Refunds" },
  { href: "/review-policy", label: "Review policy" },
];

/** The designer's credit (footer block): a visible link when it has an https:// address. */
function Credit({ text, url }: { text: string; url: string }) {
  if (!/^https:\/\//.test(url)) return <p>{text}</p>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className="underline decoration-ink-fg/25 underline-offset-[3px] transition-colors hover:text-peach hover:decoration-peach"
    >
      {text}
    </a>
  );
}

/**
 * Footer from the 1a canvases: deep-ink ground, the wordmark, the tagline,
 * link columns (two on phones, brand + three on desktop), then the bottom:
 * copyright and policy links, and under them the ABN and town (the footer
 * block's `place`) and the designer's credit. The terms carry the full
 * who-we-are, so this stays short.
 */
export function SiteFooter({
  tagline,
  abn,
  place,
  credit,
  coachesOnly = false,
}: {
  tagline: string;
  abn: string;
  place: string;
  credit: { text: string; url: string };
  /** The coaches stage (src/lib/launch.ts): no "Find" column, since the rider side isn't open yet. */
  coachesOnly?: boolean;
}) {
  const shownColumns = coachesOnly ? COACH_STAGE_COLUMNS : columns;
  const details = [abn && `ABN ${abn}`, place.trim()].filter(Boolean).join(" · ");
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-ink-deep text-ink-fg">
      <div className="mx-auto max-w-[1184px] px-[18px] pt-11 md:px-12 md:pt-16">
        <div className="grid grid-cols-1 gap-7 md:grid-cols-[2fr_1fr_1fr_1fr] md:gap-10">
          <div>
            <Link href="/" aria-label="Equine Professionals Australia, home" className="inline-block">
              <Wordmark size={30} className="md:hidden" />
              <Wordmark size={36} className="hidden md:block" />
            </Link>
            <p className="mt-2.5 max-w-[280px] text-[14px] leading-[1.5] text-ink-fg/70 md:mt-3 md:max-w-[320px] md:text-[15px]">
              {tagline}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5 md:contents">
            {shownColumns.map((col) => (
              <div
                key={col.heading}
                className={`text-[15px] leading-[1.9] text-ink-fg/85 md:leading-[2] ${col.desktopOnly ? "hidden md:block" : ""}`}
              >
                <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-fg/50 md:mb-2">
                  {col.heading}
                </div>
                {col.links.map((l) => (
                  <Link key={l.label} href={l.href} className="block hover:text-peach">
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Two rows, each split left and right: who we are and the policies,
            then the small print and the credit. Stacked on phones. */}
        <div className="mt-9 border-t border-ink-fg/15 md:mt-12">
          <div className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between md:gap-8">
            <p className="text-[13px] text-ink-fg/75">© {year} Equine Professionals Australia</p>
            <nav aria-label="Policies" className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink-fg/75">
              {LEGAL_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="transition-colors hover:text-peach">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-col gap-1.5 border-t border-ink-fg/10 pb-8 pt-4 text-[12px] text-ink-fg/45 md:flex-row md:items-center md:justify-between md:gap-8">
            {details ? <p>{details}</p> : <span />}
            {credit.text && <Credit text={credit.text} url={credit.url} />}
          </div>
        </div>
      </div>
    </footer>
  );
}
