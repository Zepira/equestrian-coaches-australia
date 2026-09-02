"use server";

import { createClient } from "@/lib/supabase/server";
import { joinedRelation } from "@/lib/supabase/joined-relation";
import { getResend, isResendConfigured, NOTIFICATIONS_FROM } from "@/lib/resend";
import { logEvent } from "@/lib/events";

export type EnquiryResult = { ok: boolean; message: string };

// The mention prompt the contact block spec asks for, repeated in the
// enquiry confirmation — a favour-to-the-coach framing, not a banner.
// Coach gender is never collected, so this always says "them", never the
// card's own gendered example ("let Jane know you found her...").
function mentionPrompt(coachName: string): string {
  const firstName = coachName.split(" ")[0];
  return `When you get in touch, let ${firstName} know you found them on Equestrian Coaches Australia — it helps them see the listing is working.`;
}

// Re-reads a coach's phone/email straight from the DB and logs a
// contact_reveal event — called by ContactRevealButton only for real
// coaches (mock/placeholder coaches reveal their already-fake value
// client-side with no server round-trip, see contact-reveal-button.tsx).
// Never trusts anything about what's currently public from the client,
// same defensive re-read shape as sendCoachEnquiry below.
export async function revealContactChannel(
  coachId: string,
  channel: "phone" | "email"
): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("contact_email, contact_phone, show_contact_email, show_contact_phone")
    .eq("id", coachId)
    .eq("published", true)
    .maybeSingle();
  if (!coach) return null;

  const value =
    channel === "phone"
      ? coach.show_contact_phone
        ? coach.contact_phone
        : null
      : coach.show_contact_email
        ? coach.contact_email
        : null;
  if (!value) return null;

  await logEvent({ kind: "contact_reveal", coachId, channel });
  return value;
}

// Pure — no I/O, just lifts the form's 4 fields off the raw FormData.
function parseEnquiryFields(formData: FormData) {
  return {
    coachId: String(formData.get("coach_id") ?? ""),
    riderName: String(formData.get("rider_name") ?? "").trim(),
    riderEmail: String(formData.get("rider_email") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Sends a rider's enquiry to the coach's contact email. Same
// degrade-gracefully pattern as notifyRidersOfClinic: with no Resend key
// set, the enquiry is logged server-side instead of sent — the form still
// works end-to-end, it just doesn't deliver until RESEND_API_KEY exists.
// Re-reads the coach's contact email + form toggle from the DB rather than
// trusting anything the client posted, so a tampered form field can't leak
// an enquiry to an arbitrary address or reach a coach who's turned the
// form off.
export async function sendCoachEnquiry(
  _prevState: EnquiryResult | null,
  formData: FormData
): Promise<EnquiryResult> {
  const { coachId, riderName, riderEmail, message } = parseEnquiryFields(formData);

  if (!coachId || !riderName || !riderEmail || !message) {
    return { ok: false, message: "Please fill in every field." };
  }
  if (!isValidEmail(riderEmail)) {
    return { ok: false, message: "That doesn't look like a valid email address." };
  }

  // Mock/demo coaches (src/lib/mock-coaches.ts) have no real coach_profiles
  // row to look up or email — the form still works end-to-end for design
  // review, it just logs instead of sending, same as every other channel
  // degrading gracefully when nothing real is configured behind it.
  if (coachId.startsWith("mock:")) {
    const mockCoachName = String(formData.get("mock_coach_name") ?? "the coach");
    console.log("[enquiry:mock] Demo coach — enquiry not persisted or sent.", {
      coachId,
      riderName,
      riderEmail,
      message,
    });
    return {
      ok: true,
      message: `Sent to ${mockCoachName}. They'll reply to ${riderEmail} directly. ${mentionPrompt(mockCoachName)}`,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    console.log("[enquiry:mock] Supabase not configured — enquiry not persisted or sent.", {
      coachId,
      riderName,
      riderEmail,
      message,
    });
    return {
      ok: true,
      message: "Thanks — this site is running on placeholder data, so nothing was actually sent.",
    };
  }

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("contact_email, show_contact_form, slug, profiles!coach_profiles_id_fkey(name)")
    .eq("id", coachId)
    .eq("published", true)
    .maybeSingle();

  if (!coach || !coach.show_contact_form || !coach.contact_email) {
    return { ok: false, message: "This coach isn't taking enquiries through the site right now." };
  }

  const coachName = joinedRelation<{ name: string }>(coach, "profiles")?.name ?? "there";

  const resend = getResend();
  if (isResendConfigured && resend) {
    try {
      await resend.emails.send({
        from: NOTIFICATIONS_FROM,
        to: coach.contact_email,
        replyTo: riderEmail,
        subject: `New enquiry from ${riderName} via Equestrian Coaches Australia`,
        text: `Hi ${coachName},\n\n${riderName} sent you an enquiry through your Equestrian Coaches Australia profile:\n\n"${message}"\n\nReply direct to this email to reach them at ${riderEmail}.`,
      });
    } catch (err) {
      console.error("sendCoachEnquiry: send failed", err);
      return { ok: false, message: "Something went wrong sending that — please try again shortly." };
    }
  } else {
    console.log("[enquiry:mock] RESEND_API_KEY not set — logging instead of sending.", {
      to: coach.contact_email,
      riderName,
      riderEmail,
      message,
    });
  }

  // "We log both paths" (spec) — contact_reveal covers the phone/email
  // reveal path, this covers the form path.
  await logEvent({ kind: "enquiry_sent", coachId, channel: "form" });

  return {
    ok: true,
    message: `Sent to ${coachName}. They'll reply to ${riderEmail} directly. ${mentionPrompt(coachName)}`,
  };
}
