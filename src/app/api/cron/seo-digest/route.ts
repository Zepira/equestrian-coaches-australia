import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { buildSeoDigest, renderDigestText } from "@/lib/seo-digest";

// Weekly SEO digest (spec: "Vercel Cron + CRON_SECRET → Resend email, not a
// dashboard"). Always computes the on-site section (search_events — real
// data, no external dependency); the GSC-dependent sections degrade to a
// single explanatory line until the domain property is verified and the
// service account granted access (see src/lib/search-console.ts,
// CLAUDE.md). Configure as a Vercel Cron job (vercel.json) once deployed;
// call manually with the CRON_SECRET header until then.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sections = await buildSeoDigest(supabase);
  const text = renderDigestText(sections);

  const recipient = process.env.SEO_DIGEST_EMAIL;
  if (!recipient) {
    // The digest still ran and is readable in the response body and the log,
    // which is what makes it testable before there is anywhere to send it.
    console.log("seo-digest (not sent — SEO_DIGEST_EMAIL not set):\n", text);
    return NextResponse.json({ sent: false, sections: sections.map((s) => s.title) });
  }

  // Through sendEmail like every other email the site sends, rather than
  // calling Resend here: that is what gives it the shared HTML layout, a
  // reply-to, the bounced-address check and one place where a rejected send
  // gets logged instead of vanishing. campaign: true because it is a
  // scheduled job, so CRON_EMAILS_ENABLED decides whether it goes out — the
  // rule is every cron that sends passes it, with no exceptions to remember.
  const result = await sendEmail({
    to: recipient,
    subject: `SEO digest — ${new Date().toISOString().slice(0, 10)}`,
    text,
    campaign: true,
  });

  return NextResponse.json({ sent: result === "sent", result, sections: sections.map((s) => s.title) });
}
