import { getResend, isResendConfigured, NOTIFICATIONS_FROM } from "@/lib/resend";
import { commercialFooter, oneClickUrl, type Purpose } from "@/lib/audience";
import { getBusinessAbn } from "@/lib/settings";
import { createServiceSupabase } from "@/lib/supabase/service";

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
  commercial,
}: {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
  /** The one-click unsubscribe endpoint (RFC 8058): mail apps show their own "Unsubscribe" button for it. */
  unsubscribe?: string;
  /**
   * A commercial email (The Marketing Engine §05.2): the recipient's contact
   * token and the purpose they agreed to. Adds who we are, how to reach us and
   * how to stop, and a one-click header when the caller didn't give its own.
   * The caller has already checked canSend().
   */
  commercial?: { token: string; purpose: Purpose };
}): Promise<"sent" | "logged" | "failed"> {
  let recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  // Nothing goes to an address that bounced (suppressions); a commercial
  // email's consent check happened before this, in canSend().
  const service = createServiceSupabase();
  if (service && recipients.length) {
    const { data: bounced } = await service.from("suppressions").select("email").eq("reason", "bounce").in("email", recipients.map((r) => r.toLowerCase()));
    const skip = new Set((bounced ?? []).map((b) => b.email as string));
    recipients = recipients.filter((r) => !skip.has(r.toLowerCase()));
  }
  if (recipients.length === 0) return "logged";
  if (commercial) {
    text = `${text}\n\n--\n${commercialFooter(commercial.token, await getBusinessAbn())}`;
    unsubscribe = unsubscribe ?? oneClickUrl(commercial.token, commercial.purpose);
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
