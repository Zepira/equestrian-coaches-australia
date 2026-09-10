"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getResend, isResendConfigured, NOTIFICATIONS_FROM } from "@/lib/resend";
import { logReveal } from "@/lib/coach-events";
import { getMockCoachBySlug } from "@/lib/mock-coaches";

export type EnquiryResult = { ok: boolean; message: string };
export type EnquiryWant = "regular" | "one_off" | "clinic";

const WANT_LABEL: Record<EnquiryWant, string> = {
  regular: "Regular lessons",
  one_off: "A one-off lesson",
  clinic: "A clinic",
};

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const looksLikeMobile = (s: string) => /^(\+?61|0)[2-9]\d{8}$/.test(s.replace(/[\s()-]/g, ""));

/**
 * A rider's enquiry (canvas: Coach Profile › "Message Isabella"): name,
 * email-or-mobile, what they want (regular / one-off / clinic), message.
 *
 * Persists an `enquiries` row (the coach's inbox, the rider's sent list,
 * the monthly numbers) with the service-role client — the table has no
 * insert policy — then emails the coach via Resend, or logs when no key is
 * set. Everything about the coach (contact email, form toggle, taking-
 * students state, published) is re-read from the DB, never trusted from
 * the form.
 */
export async function sendCoachEnquiry(
  _prevState: EnquiryResult | null,
  formData: FormData
): Promise<EnquiryResult> {
  const coachId = String(formData.get("coach_id") ?? "");
  const riderName = String(formData.get("rider_name") ?? "").trim();
  const riderContact = String(formData.get("rider_contact") ?? formData.get("rider_email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const wantRaw = String(formData.get("want") ?? "regular");
  const want: EnquiryWant = (["regular", "one_off", "clinic"] as const).includes(wantRaw as EnquiryWant)
    ? (wantRaw as EnquiryWant)
    : "regular";

  if (!coachId || !riderName || !riderContact || !message) {
    return { ok: false, message: "Please fill in every field." };
  }
  if (!looksLikeEmail(riderContact) && !looksLikeMobile(riderContact)) {
    return { ok: false, message: "Enter an email address or an Australian mobile number." };
  }

  // Mock/demo coaches (src/lib/mock-coaches.ts) have no coach_profiles row
  // — the form still works end-to-end for design review, it just logs.
  if (coachId.startsWith("mock:")) {
    const mockCoachName = String(formData.get("mock_coach_name") ?? "the coach");
    console.log("[enquiry:mock] Demo coach — enquiry not persisted or sent.", { coachId, riderName, riderContact, want, message });
    return { ok: true, message: `Sent to ${mockCoachName}. They'll reply to ${riderContact} directly.` };
  }

  const supabase = await createClient();
  if (!supabase) {
    console.log("[enquiry:mock] Supabase not configured — enquiry not persisted or sent.", { coachId, riderName, riderContact, want, message });
    return { ok: true, message: "Thanks — this site is running on placeholder data, so nothing was actually sent." };
  }

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("contact_email, show_contact_form, taking_students, slug, profiles!coach_profiles_id_fkey(name)")
    .eq("id", coachId)
    .eq("published", true)
    .maybeSingle();

  if (!coach || !coach.show_contact_form) {
    return { ok: false, message: "This coach isn't taking enquiries through the site right now." };
  }
  if (coach.taking_students === "no") {
    return { ok: false, message: "This coach isn't taking new students right now." };
  }

  const coachName = (coach as unknown as { profiles: { name: string } | null }).profiles?.name ?? "there";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await service.from("enquiries").insert({
      coach_id: coachId,
      rider_id: user?.id ?? null,
      rider_name: riderName,
      rider_contact: riderContact,
      want,
      message,
    });
    if (error) throw error;
  } catch (err) {
    console.error("sendCoachEnquiry: insert failed", err);
    return { ok: false, message: "Something went wrong saving that — please try again shortly." };
  }

  const resend = getResend();
  if (isResendConfigured && resend && coach.contact_email) {
    try {
      await resend.emails.send({
        from: NOTIFICATIONS_FROM,
        to: coach.contact_email,
        replyTo: looksLikeEmail(riderContact) ? riderContact : undefined,
        subject: `New enquiry from ${riderName} via Equestrian Coaches Australia`,
        text: `Hi ${coachName},\n\n${riderName} sent you an enquiry through your Equestrian Coaches Australia profile.\n\nLooking for: ${WANT_LABEL[want]}\nContact: ${riderContact}\n\n"${message}"\n\nMark it replied / booked in your dashboard: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/dashboard/enquiries`,
      });
    } catch (err) {
      console.error("sendCoachEnquiry: send failed", err);
      // The row is saved — the coach will still see it in the inbox.
    }
  } else {
    console.log("[enquiry:mock] RESEND_API_KEY not set — saved to inbox, logging instead of sending.", {
      to: coach.contact_email,
      riderName,
      riderContact,
      want,
      message,
    });
  }

  return { ok: true, message: `Sent to ${coachName}. They'll reply to ${riderContact} directly.` };
}

/**
 * Click-to-reveal phone (canvas: "Show phone number"). The number is never
 * in the page HTML; this fetches it on click and logs a `reveal` event.
 * Mock coaches resolve from the mock roster; real coaches from the DB, and
 * only when they have the channel switched on and are published.
 */
export async function revealPhone(coachId: string): Promise<{ phone: string | null }> {
  if (coachId.startsWith("mock:")) {
    const mock = getMockCoachBySlug(coachId.slice(5));
    return { phone: mock?.contact.phone ?? null };
  }
  const supabase = await createClient();
  if (!supabase) return { phone: null };
  const { data } = await supabase
    .from("coach_profiles")
    .select("contact_phone, show_contact_phone")
    .eq("id", coachId)
    .eq("published", true)
    .maybeSingle();
  if (!data || !data.show_contact_phone || !data.contact_phone) return { phone: null };
  await logReveal(coachId);
  return { phone: data.contact_phone };
}
