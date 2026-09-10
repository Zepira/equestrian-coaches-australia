import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

const columns = [
  {
    heading: "Riders",
    links: [
      { href: "/search", label: "Find a coach" },
      { href: "/disciplines/dressage", label: "Disciplines" },
      { href: "/account", label: "My account" },
    ],
  },
  {
    heading: "Coaches",
    links: [
      { href: "/signup?role=coach", label: "List your profile" },
      { href: "/for-coaches", label: "Pricing" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    heading: "About",
    links: [
      { href: "/login", label: "Log in" },
      { href: "mailto:hello@equestriancoaches.au", label: "Contact" },
    ],
    desktopOnly: true,
  },
];

/**
 * Footer from the 1a canvases: deep-ink ground, ECA wordmark (40px phone /
 * 48px desktop), the tagline, link columns (two on phones, brand + three on
 * desktop) and the copyright line.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-ink-deep text-ink-fg">
      <div className="mx-auto max-w-[1184px] px-[18px] pt-11 md:px-12 md:pt-16">
        <div className="grid grid-cols-1 gap-7 md:grid-cols-[2fr_1fr_1fr_1fr] md:gap-10">
          <div>
            <Link href="/" aria-label="Equestrian Coaches Australia — home" className="inline-block">
              <Wordmark size={40} className="md:hidden" />
              <Wordmark size={48} className="hidden md:inline" />
            </Link>
            <p className="mt-2.5 max-w-[280px] text-[14px] leading-[1.5] text-ink-fg/70 md:mt-3 md:max-w-[320px] md:text-[15px]">
              Equestrian Coaches Australia. The coach who teaches what you ride, wherever you are.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5 md:contents">
            {columns.map((col) => (
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
        <div className="mt-8 border-t border-ink-fg/18 pb-7 pt-4 text-[12px] text-ink-fg/50 md:mt-10 md:border-0 md:pt-0 md:text-[13px]">
          © {year} Equestrian Coaches Australia
        </div>
      </div>
    </footer>
  );
}
