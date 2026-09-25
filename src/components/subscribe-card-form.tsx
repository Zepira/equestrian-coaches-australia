"use client";

import { useActionState, useEffect, useState } from "react";
import { subscribeToAlerts, type SubscribeResult } from "@/app/alerts/actions";
import { createClient } from "@/lib/supabase/client";

export type SubscribeCardProps = {
  heading: string;
  /** A line under the heading, optional. */
  lead?: string;
  /** Finishes "We'll email you when …": "a new farrier starts". */
  what: string;
  professionId?: string | null;
  door?: "coaches" | "horse_care" | null;
  termId?: string | null;
  /** Follow one professional's events instead of a place (M4). */
  providerId?: string | null;
  /** "Kyneton VIC" when the page already knows the place; otherwise the card asks. */
  place?: string | null;
  /** Where on the site it was, for the consent record ("area-page", "empty-search"). */
  source: string;
  wordings: { alerts: { id: string; body: string } | null; news: { id: string; body: string } | null };
  tone?: "light" | "shade";
};

const input = "h-11 w-full rounded-[10px] border border-border bg-white px-3.5 text-[15px] text-fg focus:border-accent focus:outline-none";

/** Remembered so the slide-in doesn't offer what someone just did. */
export const SUBSCRIBED_KEY = "epa_subscribed";

export function SubscribeCardForm(p: SubscribeCardProps) {
  const [state, action, pending] = useActionState<SubscribeResult, FormData>(subscribeToAlerts, null);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    createClient()
      ?.auth.getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);
  useEffect(() => {
    if (state?.ok) {
      try {
        localStorage.setItem(SUBSCRIBED_KEY, String(Date.now()));
      } catch {}
    }
  }, [state]);

  return (
    <div className={`rounded-[18px] border border-border p-5 wide:p-6 ${p.tone === "shade" ? "bg-shade" : "bg-surface"}`} data-subscribe-card>
      <h2 className="pr-8 font-display text-[26px] leading-[1.05] text-ink wide:text-[30px]">{p.heading}</h2>
      {p.lead && <p className="mt-2 text-[14.5px] leading-[1.5] text-muted">{p.lead}</p>}
      {state?.ok ? (
        <p role="status" className="mt-3 text-[15px] leading-[1.5] text-fg">{state.message}</p>
      ) : (
        <form action={action} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="what" value={p.what} />
          <input type="hidden" name="source" value={p.source} />
          {p.professionId && <input type="hidden" name="profession_id" value={p.professionId} />}
          {p.termId && <input type="hidden" name="term_id" value={p.termId} />}
          {p.providerId && <input type="hidden" name="provider_id" value={p.providerId} />}
          {p.door && <input type="hidden" name="door" value={p.door} />}
          {p.wordings.alerts && <input type="hidden" name="alerts_wording" value={p.wordings.alerts.id} />}
          {p.wordings.news && <input type="hidden" name="news_wording" value={p.wordings.news.id} />}
          {/* A field people can't see; bots fill it in. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-px w-px" />
          <div className="grid gap-3 sm:grid-cols-2">
            {p.providerId ? null : p.place ? (
              <input type="hidden" name="place" value={p.place} />
            ) : (
              <label className="block">
                <span className="sr-only">Suburb or postcode</span>
                <input name="place" required placeholder="Suburb or postcode" className={input} />
              </label>
            )}
            {!signedIn && (
              <label className={`block ${p.place || p.providerId ? "sm:col-span-2" : ""}`}>
                <span className="sr-only">Email</span>
                <input name="email" type="email" required autoComplete="email" placeholder="Your email" className={input} />
              </label>
            )}
          </div>
          {p.wordings.alerts && <p className="text-[13px] leading-[1.5] text-subtle">{p.wordings.alerts.body}</p>}
          {p.wordings.news && (
            <label className="flex gap-2.5 text-[14px] leading-[1.45] text-fg">
              <input type="checkbox" name="news" className="mt-0.5 accent-accent" />
              <span>{p.wordings.news.body}</span>
            </label>
          )}
          {state && !state.ok && <p role="alert" className="text-[14px] text-danger">{state.message}</p>}
          <button type="submit" disabled={pending} className="h-11 rounded-[var(--radius-pill)] bg-ink px-5 text-[15px] font-semibold text-ink-fg hover:bg-ink-card disabled:opacity-60 sm:w-fit">
            {pending ? "Just a moment…" : "Email me"}
          </button>
        </form>
      )}
    </div>
  );
}
