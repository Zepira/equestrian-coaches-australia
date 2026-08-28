import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getResend, isResendConfigured, NOTIFICATIONS_FROM } from "@/lib/resend";
import { buildSeoDigest, renderDigestHtml, renderDigestText } from "@/lib/seo-digest";

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
  if (!isResendConfigured || !recipient) {
    // Same "log it, don't send it" degrade as notifyRidersOfClinic when
    // Resend isn't configured — the digest still ran and is testable via
    // the response body even with no email provider wired up.
    console.log("seo-digest (not sent — Resend or SEO_DIGEST_EMAIL not configured):\n", text);
    return NextResponse.json({ sent: false, sections: sections.map((s) => s.title) });
  }

  const resend = getResend()!;
  const { error } = await resend.emails.send({
    from: NOTIFICATIONS_FROM,
    to: recipient,
    subject: `SEO digest — ${new Date().toISOString().slice(0, 10)}`,
    text,
    html: renderDigestHtml(sections),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sent: true, sections: sections.map((s) => s.title) });
}
