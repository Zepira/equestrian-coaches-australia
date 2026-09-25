import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { unsubscribe } from "@/lib/rider-email";

// One-click unsubscribe (RFC 8058): mail apps POST here from the
// List-Unsubscribe header on every rider email. No login, no page; the alert
// (a=), every alert (r=) or the waitlist (w=) stops at once. Only POST changes anything, so a
// link scanner fetching the URL can't unsubscribe anyone.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const service = createServiceSupabase();
  if (!service) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const result = await unsubscribe(service, {
    alert: url.searchParams.get("a") ?? undefined,
    rider: url.searchParams.get("r") ?? undefined,
    waitlist: url.searchParams.get("w") ?? undefined,
  });
  return NextResponse.json({ unsubscribed: result !== "unknown" }, { status: result === "unknown" ? 404 : 200 });
}
