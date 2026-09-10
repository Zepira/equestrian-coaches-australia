import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const title = "Equestrian Coaches Australia";
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
  metadataBase: new URL(siteUrl),
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${instrument.variable} ${hanken.variable}`}
      // The inline script below sets data-overlay-route on this element
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
        <Script
          id="overlay-route"
          strategy="beforeInteractive"
        >{`document.documentElement.dataset.overlayRoute = String(location.pathname === "/");`}</Script>
        {/* .reveal (src/app/globals.css) fades real content in as it scrolls
            into view — a scroll-reveal component has to start that content
            at opacity: 0 in the server-rendered HTML for the fade-in to
            exist at all, which only actually shows anything once the
            IntersectionObserver in src/components/reveal.tsx runs. This is
            the one-line insurance for whenever it doesn't: JS disabled, or
            failing to hydrate. Never leaves real, SEO-relevant content
            (discipline blurbs, coach cards) permanently invisible. */}
        <noscript>
          <style>{"[data-reveal] { opacity: 1 !important; transform: none !important; }"}</style>
        </noscript>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-pill)] focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
