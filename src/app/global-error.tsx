"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { CONTACT_EMAIL } from "@/lib/site-url";

/**
 * When the root layout itself fails, this replaces the whole document, so it
 * brings its own <html>, <body> and styles: none of globals.css, the fonts
 * or the header reach it. Plain on purpose, in the brand's colours.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-AU">
      <body style={{ margin: 0, background: "#f6f1e7", color: "#22201c", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
        <title>Something went wrong | Equine Professionals Australia</title>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 20px" }}>
          <p style={{ fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "#b4553a", margin: 0 }}>Equine Professionals Australia</p>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 44, lineHeight: 1.05, color: "#1f3a2e", margin: "14px 0 0" }}>
            The site didn&apos;t load.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "#4a4842", margin: "20px 0 0" }}>
            It&apos;s not you. Something went wrong on our side, and we&apos;ve been told about it. Try again in a moment.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{ background: "#b4553a", color: "#f6f1e7", border: 0, borderRadius: 999, padding: "15px 24px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
            {/* A full page load, not a client navigation: the app around it is what broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ border: "1px solid #1f3a2e", color: "#1f3a2e", borderRadius: 999, padding: "14px 24px", fontSize: 16, textDecoration: "none" }}>
              Go to the home page
            </a>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#6c685e", marginTop: 40 }}>
            If it keeps happening, email <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#b4553a" }}>{CONTACT_EMAIL}</a>
            {error.digest ? <> and quote <code>{error.digest}</code> so we can find it.</> : " and tell us what you were doing."}
          </p>
        </main>
      </body>
    </html>
  );
}
