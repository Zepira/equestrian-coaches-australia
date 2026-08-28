import { Resend } from "resend";

export const isResendConfigured = Boolean(process.env.RESEND_API_KEY);

// Returns null until RESEND_API_KEY is set (see .env.example) — same
// degrade-gracefully pattern as Supabase/Stripe. Callers should still do
// the DB work (log the intended notification) even when this is null, so
// nothing about the matching logic depends on email actually being wired.
export function getResend(): Resend | null {
  if (!isResendConfigured) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export const NOTIFICATIONS_FROM = "Equestrian Coaches Australia <notifications@equestriancoaches.com.au>";
