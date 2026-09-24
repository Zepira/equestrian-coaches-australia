"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import { logReveal, primaryProfessionOf } from "@/lib/coach-events";
import { getMockProfessionalBySlug } from "@/lib/mock-professionals";
import { getMockCoachBySlug } from "@/lib/mock-coaches";
import { absoluteUrl } from "@/lib/site-url";

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
  const coachId = String(formData.get("provider_id") ?? "");
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

  // Mock/demo coaches (src/lib/mock-coaches.ts) have no providers row
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
    .from("providers")
    .select("name, contact_email, show_contact_form, availability, slug")
    .eq("id", coachId)
    .eq("status", "published")
    .maybeSingle();

  if (!coach || !coach.show_contact_form) {
    return { ok: false, message: "This coach isn't taking enquiries through the site right now." };
  }
  if (coach.availability === "no") {
    return { ok: false, message: "This coach isn't taking new students right now." };
  }

  const coachName = coach.name?.split(" ")[0] || "there";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const professionId = await primaryProfessionOf(coachId);
  try {
    const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await service.from("enquiries").insert({
      provider_id: coachId,
      profession_id: professionId,
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

  if (coach.contact_email) {
    // Saved either way: the inbox has it even if the email doesn't go.
    const copy = await getContent("email.enquiry");
    const vars = {
      first_name: coachName,
      rider_name: riderName,
      rider_contact: riderContact,
      // "Regular visits" for a farrier: the profession's own options first.
      want: (await getProfessions()).find((x) => x.id === professionId)?.enquiryOptions.find((o) => o.value === want)?.label ?? WANT_LABEL[want] ?? want,
      message,
      dashboard_url: absoluteUrl("/dashboard/enquiries"),
    };
    await sendEmail({
      to: coach.contact_email,
      replyTo: looksLikeEmail(riderContact) ? riderContact : undefined,
      subject: fillVariables(copy.subject, vars),
      text: fillVariables(copy.body, vars),
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
    const slug = coachId.slice(5);
    const mock = getMockCoachBySlug(slug);
    if (mock) return { phone: mock.contact.phone ?? null };
    // Mock horse care professionals share the sentinel (src/lib/mock-professionals.ts).
    return { phone: getMockProfessionalBySlug(slug)?.contact.phone ?? null };
  }
  const supabase = await createClient();
  if (!supabase) return { phone: null };
  const { data } = await supabase
    .from("providers")
    .select("contact_phone, show_contact_phone")
    .eq("id", coachId)
    .eq("status", "published")
    .maybeSingle();
  if (!data || !data.show_contact_phone || !data.contact_phone) return { phone: null };
  await logReveal(coachId);
  return { phone: data.contact_phone };
}
