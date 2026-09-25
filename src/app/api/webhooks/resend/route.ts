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

type ResendEvent = { type: string; data?: { to?: string[] | string; bounce?: { type?: string } } };

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
  return NextResponse.json({ ok: true });
}
