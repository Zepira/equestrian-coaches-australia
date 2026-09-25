import { getResend, isResendConfigured, NOTIFICATIONS_FROM } from "@/lib/resend";

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
export async function sendEmail({
  to,
  subject,
  text,
  replyTo,
  unsubscribe,
  campaign,
}: {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
  /** The one-click unsubscribe endpoint (RFC 8058): mail apps show their own "Unsubscribe" button for it. */
  unsubscribe?: string;
  /** One of the scheduled bulk emails, so CRON_EMAILS_ENABLED decides whether it sends. */
  campaign?: boolean;
}): Promise<"sent" | "logged" | "failed"> {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) return "logged";
  if (campaign && !CRON_EMAILS_ENABLED) {
    console.log(`email (not sent, CRON_EMAILS_ENABLED is off) to ${recipients.join(", ")}: ${subject}\n${text}`);
    return "logged";
  }
  const resend = getResend();
  if (!isResendConfigured || !resend) {
    console.log(`email (not sent, Resend not configured) to ${recipients.join(", ")}: ${subject}\n${text}`);
    return "logged";
  }
  try {
    await resend.emails.send({
      from: NOTIFICATIONS_FROM,
      to: recipients,
      subject,
      text,
      ...(replyTo ? { replyTo } : {}),
      ...(unsubscribe ? { headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
    });
    return "sent";
  } catch (err) {
    console.error("sendEmail failed", subject, err);
    return "failed";
  }
}
