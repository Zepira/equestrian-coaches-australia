import { getResend, isResendConfigured, NOTIFICATIONS_FROM } from "@/lib/resend";
import { commercialFooter, oneClickUrl, type Purpose } from "@/lib/audience";
import { getBusinessAbn } from "@/lib/settings";
import { createServiceSupabase } from "@/lib/supabase/service";

/**
 * Whether the scheduled bulk emails actually go out: the monthly rider
 * round-up, the monthly provider numbers and the founding reminders. Off until
 * launch, so a test deployment can run those jobs against real rows and real
 * matching without a single email reaching a real person. What each one would
 * have sent goes to the server log instead.
 *
 * Only the string "true" turns it on, so a missing variable means nothing is
 * sent. Transactional email (an enquiry, a profile going live, the waitlist
 * confirmation) ignores this: those answer something a person just did.
 */
export const CRON_EMAILS_ENABLED = process.env.CRON_EMAILS_ENABLED === "true";

/**
 * One way to send an email from the app. With Resend set up it sends; without
 * it (today) it writes the email to the server log and reports "logged", the
 * same degrade-gracefully shape as every other integration here, so the
 * sign-up, review and billing flows are testable before a key exists.
 * Never throws: a failed email must not undo the save that triggered it.
 */
type SendArgs = {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
  /** The one-click unsubscribe endpoint (RFC 8058): mail apps show their own "Unsubscribe" button for it. */
  unsubscribe?: string;
  /** One of the scheduled bulk emails, so CRON_EMAILS_ENABLED decides whether it sends. */
  campaign?: boolean;
  /**
   * A commercial email (The Marketing Engine §05.2): the recipient's contact
   * token and the purpose they agreed to. Adds who we are, how to reach us and
   * how to stop, and a one-click header when the caller didn't give its own.
   * The caller has already checked canSend().
   */
  commercial?: { token: string; purpose: Purpose };
};

export async function sendEmail(args: SendArgs): Promise<"sent" | "logged" | "failed"> {
  return (await sendEmailWithId(args)).result;
}

/** The same, also returning Resend's id for the message, so its webhook events can be matched to the send. */
export async function sendEmailWithId({ to, subject, text, replyTo, unsubscribe, campaign, commercial }: SendArgs): Promise<{ result: "sent" | "logged" | "failed"; id: string | null }> {
  let recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) return { result: "logged", id: null };
  if (campaign && !CRON_EMAILS_ENABLED) {
    console.log(`email (not sent, CRON_EMAILS_ENABLED is off) to ${recipients.join(", ")}: ${subject}\n${text}`);
    return { result: "logged", id: null };
  }
  // Nothing goes to an address that bounced (suppressions); a commercial
  // email's consent check happened before this, in canSend().
  const service = createServiceSupabase();
  if (service && recipients.length) {
    const { data: bounced } = await service.from("suppressions").select("email").eq("reason", "bounce").in("email", recipients.map((r) => r.toLowerCase()));
    const skip = new Set((bounced ?? []).map((b) => b.email as string));
    recipients = recipients.filter((r) => !skip.has(r.toLowerCase()));
  }
  if (recipients.length === 0) return { result: "logged", id: null };
  if (commercial) {
    text = `${text}\n\n--\n${commercialFooter(commercial.token, await getBusinessAbn())}`;
    unsubscribe = unsubscribe ?? oneClickUrl(commercial.token, commercial.purpose);
  }
  const resend = getResend();
  if (!isResendConfigured || !resend) {
    console.log(`email (not sent, Resend not configured) to ${recipients.join(", ")}: ${subject}\n${text}`);
    return { result: "logged", id: null };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: NOTIFICATIONS_FROM,
      to: recipients,
      subject,
      text,
      ...(replyTo ? { replyTo } : {}),
      ...(unsubscribe ? { headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
    });
    // The SDK reports a rejected send by returning { data: null, error },
    // not by throwing, so the catch below never sees it. Reading only `data`
    // meant an unverified domain or a from address on the wrong one was
    // recorded as sent and logged nowhere: mail silently vanished.
    if (error) {
      console.error(
        `sendEmail rejected by Resend (${error.name}): ${error.message} — from "${NOTIFICATIONS_FROM}" to ${recipients.join(", ")}`
      );
      return { result: "failed", id: null };
    }
    return { result: "sent", id: data?.id ?? null };
  } catch (err) {
    console.error("sendEmail failed", subject, err);
    return { result: "failed", id: null };
  }
}
