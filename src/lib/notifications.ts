import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getResend, isResendConfigured, NOTIFICATIONS_FROM } from "@/lib/resend";

// Service-role client, not the request-scoped one — this runs after the
// coach's own request context ends (fire-and-forget from createClinic)
// and needs to read across every rider's preferences regardless of RLS.
function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Matches a newly-created clinic against rider_preferences (discipline or
// 100km radius — see matching_riders_for_clinic in
// supabase/migrations/0006_notify_matching.sql), emails each match via
// Resend, and logs every attempt to notifications_log so a rider is never
// emailed twice about the same clinic (also doubles as an audit trail
// while Resend isn't configured yet).
export async function notifyRidersOfClinic(clinicId: string) {
  const supabase = serviceClient();

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("title, start_date, location_text, coach_id, coach_profiles(slug)")
    .eq("id", clinicId)
    .single();
  if (clinicError || !clinic) {
    console.error("notifyRidersOfClinic: clinic not found", clinicId, clinicError);
    return { sent: 0, matched: 0 };
  }

  const { data: matches, error: matchError } = await supabase.rpc("matching_riders_for_clinic", {
    p_clinic_id: clinicId,
  });
  if (matchError) {
    console.error("notifyRidersOfClinic: matching failed", matchError);
    return { sent: 0, matched: 0 };
  }
  if (!matches || matches.length === 0) return { sent: 0, matched: 0 };

  const coachSlug = (clinic as unknown as { coach_profiles: { slug: string } | null }).coach_profiles
    ?.slug;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const clinicDate = new Date(clinic.start_date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const resend = getResend();
  let sent = 0;

  for (const match of matches as { rider_id: string; email: string }[]) {
    if (isResendConfigured && resend) {
      try {
        await resend.emails.send({
          from: NOTIFICATIONS_FROM,
          to: match.email,
          subject: `New clinic: ${clinic.title}`,
          text: `${clinic.title}\n${clinicDate} · ${clinic.location_text}\n\nSee it here: ${siteUrl}${
            coachSlug ? `/coaches/${coachSlug}` : "/search"
          }`,
        });
        sent += 1;
      } catch (err) {
        console.error(`notifyRidersOfClinic: send failed for ${match.email}`, err);
        continue; // don't log a send that didn't happen
      }
    }
    // Log regardless of whether Resend is configured — in mock/no-email
    // mode this is the visible record that matching worked.
    await supabase
      .from("notifications_log")
      .upsert({ rider_id: match.rider_id, clinic_id: clinicId }, { onConflict: "rider_id,clinic_id" });
  }

  return { sent, matched: matches.length };
}
