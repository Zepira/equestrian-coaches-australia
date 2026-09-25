import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Instrument_Serif } from "next/font/google";
import { headers } from "next/headers";
import { horseCareOf, horseCarePrefixes, sectionHref } from "@/lib/professions";
import { getContent, getFeaturedDisciplines, getProfessions } from "@/lib/cms/read";
import { SITE_LAUNCHED, showsComingSoon } from "@/lib/launch";
import "./globals.css";
import { BootScript } from "@/components/boot-script";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Parallax } from "@/components/hero-parallax";
import { disciplinePath } from "@/lib/page-paths";
import { SITE_URL } from "@/lib/site-url";
import { SiteNudges } from "@/components/site-nudges";
import { getAlertWordings } from "@/components/subscribe-card";
import { getSlideInDelaySeconds, getSlideInEveryDays, isSlideInEnabled } from "@/lib/settings";

// Golden Hour type: Instrument Serif (display, regular + italic — the face
// has no other weights) and Hanken Grotesk (body).
const instrument = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const title = "Equine Professionals Australia";
const description =
  "Find your perfect riding coach, nearby. Search verified coaches across Australia by discipline and location.";

// `viewport-fit: cover` is what lets the hero photo and the header's own
// background paint underneath the iOS status bar / notch / Dynamic Island
// instead of Safari letterboxing the page inside the "safe area" and
// showing its own white chrome behind it. Content itself still has to
// opt back IN to that space deliberately via env(safe-area-inset-*) — see
// `.site-header`/`.hero__body` in globals.css — or text would render
// underneath the notch instead of just the background.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Tints Safari's own chrome (status bar / bottom bar) to match the page.
  // Overridden to the hero's ink green on "/" itself — see the `viewport`
  // export in src/app/page.tsx — since that's the one route where the
  // page's own top edge is dark, not this cream ground colour.
  themeColor: "#f6f1e7",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description,
  openGraph: {
    type: "website",
    siteName: title,
    title,
    description,
    locale: "en_AU",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Before launch the public host serves one page, the coming soon page, and
  // it gets no header or footer: a nav full of links to an unlaunched site is
  // exactly what the proxy is there to stop, and hiding it in CSS would still
  // put every link in the HTML for a crawler to follow.
  //
  // The host is only read while SITE_LAUNCHED is off, and && short-circuits,
  // so headers() is never called once the site has launched and the layout
  // goes back to being static. The cost lands on the one page that has no
  // traffic yet, and disappears on launch day.
  const comingSoon = !SITE_LAUNCHED && showsComingSoon((await headers()).get("host"));

  // The CMS reads are cached and cookie-free, so the layout stays static.
  const [professions, featured, footer, announcement, slideCopy, slideOn, slideDelay, slideEvery, wordings] = await Promise.all([
    getProfessions(),
    getFeaturedDisciplines(),
    getContent("footer"),
    getContent("site.announcement"),
    getContent("site.slide_in"),
    isSlideInEnabled(),
    getSlideInDelaySeconds(),
    getSlideInEveryDays(),
    getAlertWordings(),
  ]);
  const prefixes = horseCarePrefixes(professions);
  const header = {
    horseCareMenu: [
      ...horseCareOf(professions).map((p) => ({ href: sectionHref(p), label: p.name })),
      { href: "/horse-care", label: "All horse care" },
    ],
    coachesMenu: [
      ...featured.map((d) => ({ href: disciplinePath(d.slug), label: d.name })),
      { href: "/coaches#disciplines", label: "All disciplines" },
    ],
    horseCarePrefixes: prefixes,
  };
  return (
    <html
      lang="en"
      className={`h-full antialiased ${instrument.variable} ${hanken.variable}`}
      // The inline script below sets data-overlay-route (and, on horse care
      // routes, data-door, which swaps the accent colours) on this element
      // before React hydrates, same "runs before paint, outside React's
      // model" pattern as a dark-mode FOUC-prevention script — React has
      // no way to know the attribute is expected, so without this it logs
      // a hydration mismatch every time despite nothing being wrong.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        {/* Sets data-overlay-route on <html> before first paint — the same
            "does this route open with a full-bleed hero" question
            SiteHeader answers client-side via usePathname (and keeps
            correct across client-side navigation, which this script
            doesn't see, only running once on the initial load). Without
            it, the very first paint of "/" would render with <html>'s
            default cream background for one frame — see the
            `html[data-overlay-route]` rule in globals.css for why that
            background matters at all: iOS Safari's safe-area inset strip
            (behind the notch/Dynamic Island) paints <html>'s own
            background there, not whatever's in normal document flow.
            First child of <body>, not a hand-written <head> — Next's App
            Router owns <head> itself via the metadata/viewport APIs above,
            and a plain <script> child of <body> is the documented, well-
            supported way to run something this early (the same pattern
            next-themes' own FOUC-prevention script uses). */}
        <BootScript
          id="overlay-route"
          code={`document.documentElement.dataset.overlayRoute = String(["/", "/coaches", "/horse-care", "/for-coaches"].includes(location.pathname));
if (${JSON.stringify(prefixes)}.some(function (p) { return location.pathname === p || location.pathname.indexOf(p + "/") === 0; })) document.documentElement.dataset.door = "horse-care";`}
        />
        {/* .reveal (src/app/globals.css) fades real content in as it scrolls
            into view — a scroll-reveal component has to start that content
            at opacity: 0 in the server-rendered HTML for the fade-in to
            exist at all, which only actually shows anything once the
            IntersectionObserver in src/components/reveal.tsx runs. This is
            the one-line insurance for whenever it doesn't: JS disabled, or
            failing to hydrate. Never leaves real, SEO-relevant content
            (discipline blurbs, coach cards) permanently invisible. */}
        <noscript>
          <style>
            {"[data-reveal] { opacity: 1 !important; transform: none !important; }" +
              /* The search card's discipline picker is a styled menu (it needs
                 to be — a native select's option list is drawn by the OS and
                 can't carry the palette). With JavaScript off that menu can't
                 open, so the real <select> kept beside it takes over and the
                 card stays a working GET form. */
              " .nojs-only { display: flex !important; } .js-only { display: none !important; }"}
          </style>
        </noscript>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-pill)] focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
        >
          Skip to content
        </a>
        {!comingSoon && <SiteHeader {...header} />}
        {!comingSoon && <Parallax />}
        <main id="main-content" className="flex-1">
          {children}
        </main>
        {!comingSoon && <SiteFooter tagline={footer.tagline} />}
        {/* The coming soon page has its own sign-up; the announcement bar and
            slide-in would be a second, competing one. */}
        {!comingSoon && (
          <SiteNudges
            announcement={announcement}
            slideIn={{ enabled: slideOn, delaySeconds: slideDelay, everyDays: slideEvery, title: slideCopy.title, body: slideCopy.body }}
            horseCarePrefixes={prefixes}
            wordings={wordings}
          />
        )}
      </body>
    </html>
  );
}
