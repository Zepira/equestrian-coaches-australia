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

/**
 * Who the site's mail comes from. **It has to sit on the domain verified in
 * Resend**, or every send is rejected.
 *
 * Resend's own setup puts the MX and SPF records on a sending subdomain
 * (send.equineprofessionals.com.au) and leaves the apex alone, which is what
 * keeps them clear of Hostinger's mail records. Verify that subdomain and this
 * becomes notifications@send.equineprofessionals.com.au.
 *
 * An environment variable so the two can be matched up without a deploy. See
 * docs/launch.md for the full setup.
 */
export const NOTIFICATIONS_FROM =
  process.env.NOTIFICATIONS_FROM ?? "Equine Professionals Australia <notifications@equineprofessionals.com.au>";
