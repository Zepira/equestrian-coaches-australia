"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/site-url";

/**
 * What a page shows when something breaks while it renders (the error.tsx
 * files). Reports the error to Sentry, offers Try again and a way out, and
 * shows the reference Next.js gives a server error so someone writing in
 * can quote it. CONTACT_EMAIL here is the code default: an error page can't
 * be handed the setting from the server.
 */
export function ErrorView({
  error,
  retry,
  title,
  lead,
  home = { href: "/", label: "Go to the home page" },
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title: string;
  lead: string;
  home?: { href: string; label: string };
}) {
  useEffect(() => {
    // A server error arrives here with a digest and was already reported by
    // onRequestError (src/instrumentation.ts); reporting it again would add a
    // second, vaguer issue. Browser errors have no digest and are reported here.
    if (!error.digest) Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[620px] px-[18px] py-20 wide:py-28" data-error-view>
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent">Something went wrong</p>
      <h1 className="mt-3 text-[40px] leading-[1] -tracking-[0.02em] text-ink wide:text-[56px]">{title}</h1>
      <p className="mt-5 text-[17px] leading-[1.55] text-muted">{lead}</p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => retry()}>
          Try again
        </Button>
        <Link href={home.href} className="rounded-[var(--radius-pill)] border border-ink px-6 py-[14px] text-[16px] font-medium leading-none text-ink hover:bg-shade">
          {home.label}
        </Link>
      </div>
      <p className="mt-10 text-[14px] leading-[1.6] text-subtle">
        If it keeps happening, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="border-b border-current text-accent">
          {CONTACT_EMAIL}
        </a>
        {error.digest ? (
          <>
            {" "}
            and quote <span className="font-mono text-fg">{error.digest}</span> so we can find it.
          </>
        ) : (
          " and tell us what you were doing."
        )}
      </p>
    </div>
  );
}
