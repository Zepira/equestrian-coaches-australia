"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/friendly-error";
import { confirmRedirect } from "@/lib/site-url";

/** Seconds the button stays off after each send. Supabase limits how often it will email one address. */
const WAIT_SECONDS = 60;

/**
 * "Send it again", for a confirmation or reset email that didn't arrive or
 * whose link didn't work. Asks for the address when it isn't known, then
 * sends and counts down a minute before it can send again.
 *
 * kind "signup" resends the sign-up confirmation (to /auth/confirm, so it
 * works in whatever browser opens it); kind "recovery" sends a fresh password
 * reset link.
 */
export function ResendLink({
  kind,
  email: knownEmail = "",
  next = "",
  supportPhone = "",
  startWaiting = false,
  label,
}: {
  kind: "signup" | "recovery";
  email?: string;
  /** Where a confirmed sign-up goes; empty lets /auth/confirm choose by role. */
  next?: string;
  supportPhone?: string;
  /** Start with the countdown running, for a screen shown right after an email went. */
  startWaiting?: boolean;
  label?: string;
}) {
  const [email, setEmail] = useState(knownEmail);
  const [secondsLeft, setSecondsLeft] = useState(startWaiting ? WAIT_SECONDS : 0);
  const [sending, setSending] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Sign-up isn't connected yet.");
      return;
    }
    setSending(true);
    try {
      const origin = window.location.origin;
      const { error: sendError } =
        kind === "recovery"
          ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: confirmRedirect(origin, "/reset-password") })
          : await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: confirmRedirect(origin, next) } });
      if (sendError) {
        setError(friendlyAuthError(sendError, supportPhone));
        return;
      }
      setSentOnce(true);
      setSecondsLeft(WAIT_SECONDS);
    } catch (err) {
      setError(friendlyAuthError(err, supportPhone));
    } finally {
      setSending(false);
    }
  }

  const waiting = secondsLeft > 0;
  const buttonText = sending
    ? "Sending…"
    : waiting
      ? `Send again in ${secondsLeft}s`
      : (label ?? (kind === "recovery" ? "Send a new reset link" : "Send the email again"));

  return (
    <form onSubmit={send} className="flex flex-col gap-3" data-resend={kind}>
      {!knownEmail && (
        <label className="block">
          <span className={labelClass}>Your email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" required />
        </label>
      )}
      <Button type="submit" variant="secondary" disabled={sending || waiting} className="h-12 w-full text-[15px]" aria-live="polite">
        {buttonText}
      </Button>
      {sentOnce && !error && (
        <p role="status" className="text-[13.5px] leading-[1.5] text-muted">
          Sent. It can take a minute or two, and sometimes lands in spam or promotions.
          {kind === "signup" && " If you've already confirmed, just log in."}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[13.5px] leading-[1.5] text-accent">
          {error}
        </p>
      )}
    </form>
  );
}
