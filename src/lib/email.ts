import { getResend, isResendConfigured, NOTIFICATIONS_FROM } from "@/lib/resend";

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
}: {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<"sent" | "logged" | "failed"> {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) return "logged";
  const resend = getResend();
  if (!isResendConfigured || !resend) {
    console.log(`email (not sent, Resend not configured) to ${recipients.join(", ")}: ${subject}\n${text}`);
    return "logged";
  }
  try {
    await resend.emails.send({ from: NOTIFICATIONS_FROM, to: recipients, subject, text, ...(replyTo ? { replyTo } : {}) });
    return "sent";
  } catch (err) {
    console.error("sendEmail failed", subject, err);
    return "failed";
  }
}
