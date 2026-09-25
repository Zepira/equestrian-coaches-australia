"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pathInPrefixes } from "@/lib/professions";
import { SubscribeCardForm, SUBSCRIBED_KEY, type SubscribeCardProps } from "@/components/subscribe-card-form";

/**
 * The announcement bar and the slide-in (The Marketing Engine M3), both
 * words from content blocks, both quiet by design.
 *
 * The bar: one line along the bottom of the screen (the header floats over
 * the photos at the top), between its dates, for its audience, gone for good
 * once dismissed. The slide-in: off unless switched on in Settings; after a
 * delay, never to someone signed in or already subscribed, never on a
 * profile or anywhere private, at most once every few days.
 */
type Announcement = { message: string; linkLabel: string; linkHref: string; starts: string; ends: string; audience: string };
type SlideIn = { enabled: boolean; delaySeconds: number; everyDays: number; title: string; body: string };

const PRIVATE = ["/admin", "/dashboard", "/account", "/login", "/signup", "/onboarding", "/profile", "/alerts", "/email-preferences", "/unsubscribe", "/reset-password", "/forgot-password"];
const SEEN_KEY = "epa_slidein_seen";

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function SiteNudges({
  announcement,
  slideIn,
  horseCarePrefixes,
  wordings,
}: {
  announcement: Announcement;
  slideIn: SlideIn;
  horseCarePrefixes: string[];
  wordings: SubscribeCardProps["wordings"];
}) {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [showSlide, setShowSlide] = useState(false);
  const barKey = `epa_bar:${announcement.message.slice(0, 80)}`;

  useEffect(() => {
    createClient()
      ?.auth.getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)));
    // Read once on mount, after hydration, so server and client first paint agree.
    const stored = safe(() => localStorage.getItem(barKey), null);
    Promise.resolve().then(() => setDismissed(stored));
  }, [barKey]);

  useEffect(() => {
    if (!slideIn.enabled || signedIn !== false || PRIVATE.some((p) => pathname.startsWith(p))) return;
    const seen = Number(safe(() => localStorage.getItem(SEEN_KEY), null) ?? 0);
    const subscribed = safe(() => localStorage.getItem(SUBSCRIBED_KEY), null);
    if (subscribed || Date.now() - seen < slideIn.everyDays * 86_400_000) return;
    const timer = setTimeout(() => {
      setShowSlide(true);
      safe(() => localStorage.setItem(SEEN_KEY, String(Date.now())), undefined);
    }, slideIn.delaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [slideIn, signedIn, pathname]);

  const a = announcement;
  const d = today();
  const inDates = (!a.starts || a.starts <= d) && (!a.ends || d <= a.ends);
  const horseCare = pathInPrefixes(pathname, horseCarePrefixes);
  const forAudience =
    a.audience === "everyone" ||
    (a.audience === "logged_out" && signedIn === false) ||
    (a.audience === "riders" && signedIn === false) ||
    (a.audience === "coaches" && !horseCare && !pathname.startsWith("/admin")) ||
    (a.audience === "horse_care" && horseCare);
  const showBar = Boolean(a.message) && inDates && forAudience && dismissed === null && !pathname.startsWith("/admin");

  return (
    <>
      {showSlide && (
        <div role="dialog" aria-label={slideIn.title} className="fixed bottom-4 right-4 z-40 w-[min(380px,calc(100vw-2rem))] shadow-[0_18px_50px_rgba(20,40,31,0.25)]" data-slide-in>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSlide(false)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full text-[18px] text-subtle hover:bg-shade hover:text-fg"
            >
              ×
            </button>
            <SubscribeCardForm heading={slideIn.title} lead={slideIn.body} what="someone new starts" source="slide-in" wordings={wordings} />
          </div>
        </div>
      )}
      {showBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-fg/15 bg-ink text-ink-fg" data-announcement>
          <div className="mx-auto flex max-w-[1184px] items-center gap-3 px-[18px] py-2.5 text-[14px] wide:px-12">
            <p className="min-w-0 flex-1">
              {a.message}
              {a.linkHref && a.linkLabel && (
                <>
                  {" "}
                  <Link href={a.linkHref} className="font-medium text-peach underline-offset-2 hover:underline">
                    {a.linkLabel}
                  </Link>
                </>
              )}
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                safe(() => localStorage.setItem(barKey, "1"), undefined);
                setDismissed("1");
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[18px] text-ink-fg/70 hover:bg-ink-fg/10 hover:text-ink-fg"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
