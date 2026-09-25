import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServiceSupabase } from "@/lib/supabase/service";
import { stopEverything, suppress } from "@/lib/audience";

/**
 * Resend's webhooks (The Marketing Engine M1): a hard bounce stops every
 * email to that address, a spam complaint stops every commercial one and
 * withdraws their consents. Signed by Resend through Svix; set
 * RESEND_WEBHOOK_SECRET (whsec_…) from the webhook's page in Resend. Without
 * it the endpoint refuses everything.
 */
function verify(secret: string, id: string, timestamp: string, body: string, header: string): boolean {
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return header.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

type ResendEvent = { type: string; data?: { email_id?: string; to?: string[] | string; bounce?: { type?: string } } };

const EVENT_TYPE: Record<string, string> = { "email.delivered": "delivered", "email.bounced": "bounced", "email.complained": "complained" };

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const service = createServiceSupabase();
  if (!secret || !service) return NextResponse.json({ error: "Not set up" }, { status: 503 });

  const body = await request.text();
  const id = request.headers.get("svix-id") ?? "";
  const ts = request.headers.get("svix-timestamp") ?? "";
  const sig = request.headers.get("svix-signature") ?? "";
  if (!verify(secret, id, ts, body, sig)) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  const event = JSON.parse(body) as ResendEvent;
  const to = event.data?.to;
  const emails = (Array.isArray(to) ? to : to ? [to] : []).map((e) => e.toLowerCase());
  for (const email of emails) {
    if (event.type === "email.bounced") {
      // A soft bounce (full inbox) is temporary; only a permanent one stops mail.
      if ((event.data?.bounce?.type ?? "Permanent").toLowerCase().startsWith("perm")) await suppress(service, email, "bounce", event.type);
    } else if (event.type === "email.complained") {
      const { data: contact } = await service.from("contacts").select("id, email").eq("email", email).maybeSingle();
      if (contact) await stopEverything(service, { id: contact.id as string, email }, "complaint", "resend");
      await suppress(service, email, "complaint", event.type);
    }
  }
  // What happened to the message, for campaign and sequence results (M7, M8).
  const type = EVENT_TYPE[event.type];
  const resendId = event.data?.email_id;
  if (type && resendId) {
    const [{ data: send }, { data: seq }] = await Promise.all([
      service.from("campaign_sends").select("campaign_id, contact_id").eq("resend_id", resendId).maybeSingle(),
      service.from("sequence_sends").select("run_id, sequence_runs(contact_id)").eq("resend_id", resendId).maybeSingle(),
    ]);
    const seqContact = (seq as unknown as { sequence_runs: { contact_id: string | null } | null } | null)?.sequence_runs?.contact_id ?? null;
    await service.from("email_events").insert({
      resend_id: resendId,
      type,
      campaign_id: send?.campaign_id ?? null,
      sequence_run_id: seq?.run_id ?? null,
      contact_id: send?.contact_id ?? seqContact,
    });
  }
  return NextResponse.json({ ok: true });
}
