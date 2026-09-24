import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notifyRidersOfEvent } from "@/lib/rider-email";

// Service-role client, not the request-scoped one: this runs after the
// provider's own request (from createClinic and the daily backstop cron) and
// reads across every rider's alerts regardless of RLS.
function serviceClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * A new event → matching riders (src/lib/rider-email.ts): the alert's
 * profession, term and door; within the alert's radius, or event_reach_km
 * for a Clinic-plan provider; once per rider (notifications_log), with a
 * one-click unsubscribe. Kept under its old name for its two callers.
 */
export async function notifyRidersOfClinic(eventId: string) {
  return notifyRidersOfEvent(serviceClient(), eventId);
}
