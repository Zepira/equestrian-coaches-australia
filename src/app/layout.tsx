import type { Metadata, Viewport } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
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
    <html lang="en" className={`h-full antialiased ${fraunces.variable} ${workSans.variable}`}>
      <body className="flex min-h-full flex-col bg-bg text-fg">
        {/* .reveal (src/app/globals.css) fades real content in as it scrolls
            into view — a scroll-reveal component has to start that content
            at opacity: 0 in the server-rendered HTML for the fade-in to
            exist at all, which only actually shows anything once the
            IntersectionObserver in src/components/reveal.tsx runs. This is
            the one-line insurance for whenever it doesn't: JS disabled, or
            failing to hydrate. Never leaves real, SEO-relevant content
            (discipline blurbs, coach cards) permanently invisible. */}
        <noscript>
          <style>{".reveal { opacity: 1 !important; transform: none !important; }"}</style>
        </noscript>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
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
