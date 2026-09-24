import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getResend, isResendConfigured, NOTIFICATIONS_FROM } from "@/lib/resend";
import { eventPath } from "@/lib/page-paths";
import { absoluteUrl } from "@/lib/site-url";

// Service-role client, not the request-scoped one — this runs after the
// coach's own request context ends (fire-and-forget from createClinic)
// and needs to read across every rider's preferences regardless of RLS.
function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Matches a newly-created event against rider_alerts (profession, term and
// alert radius: riders_for_event() in the baseline migration), emails each
// match via Resend, and logs every attempt to notifications_log so a rider
// is never emailed twice about the same event (also the audit trail while
// Resend isn't configured). Clinic-tier reach (event_reach_km) is stage 6.
export async function notifyRidersOfClinic(clinicId: string) {
  const supabase = serviceClient();

  const { data: clinic, error: clinicError } = await supabase
    .from("events")
    .select("title, start_date, location_text, provider_id, providers(slug)")
    .eq("id", clinicId)
    .single();
  if (clinicError || !clinic) {
    console.error("notifyRidersOfClinic: clinic not found", clinicId, clinicError);
    return { sent: 0, matched: 0 };
  }

  const { data: matches, error: matchError } = await supabase.rpc("riders_for_event", {
    p_event_id: clinicId,
    p_reach_km: null,
  });
  if (matchError) {
    console.error("notifyRidersOfClinic: matching failed", matchError);
    return { sent: 0, matched: 0 };
  }
  if (!matches || matches.length === 0) return { sent: 0, matched: 0 };

  const clinicDate = new Date(clinic.start_date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const resend = getResend();
  let sent = 0;

  for (const match of matches as { rider_id: string; email: string; alert_id: string | null }[]) {
    if (isResendConfigured && resend) {
      try {
        await resend.emails.send({
          from: NOTIFICATIONS_FROM,
          to: match.email,
          subject: `New clinic: ${clinic.title}`,
          text: `${clinic.title}\n${clinicDate} · ${clinic.location_text}\n\nSee it here: ${absoluteUrl(eventPath(clinicId))}`,
        });
        sent += 1;
      } catch (err) {
        console.error(`notifyRidersOfClinic: send failed for ${match.email}`, err);
        continue; // don't log a send that didn't happen
      }
    }
    // Log regardless of whether Resend is configured — in mock/no-email
    // mode this is the visible record that matching worked.
    // One row per rider per event (a partial unique index, which upsert can't
    // target): a duplicate means already logged, which is fine.
    const { error: logError } = await supabase
      .from("notifications_log")
      .insert({ rider_id: match.rider_id, kind: "event", event_id: clinicId, alert_id: match.alert_id });
    if (logError && logError.code !== "23505") console.error("notifyRidersOfClinic: log failed", logError);
  }

  return { sent, matched: matches.length };
}
