import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { unsubscribe } from "@/lib/rider-email";
import { PURPOSES, recordConsent, stopEverything, type Purpose } from "@/lib/audience";

// One-click unsubscribe (RFC 8058): mail apps POST here from the
// List-Unsubscribe header. No login, no page, honoured at once. Only POST
// changes anything, so a link scanner fetching the URL can't unsubscribe
// anyone.
//   a=<alert token>  stops that alert
//   r=<rider token>  stops every rider email (the older links)
//   w=<waitlist token>  takes the address off the coming soon waitlist
//   t=<contact token>&p=<purpose|all>  withdraws that purpose, or everything
export async function POST(request: Request) {
  const url = new URL(request.url);
  const service = createServiceSupabase();
  if (!service) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const t = url.searchParams.get("t");
  if (t) {
    if (!/^[a-f0-9]{32,80}$/.test(t)) return NextResponse.json({ unsubscribed: false }, { status: 404 });
    const { data: contact } = await service.from("contacts").select("id, email").eq("token", t).maybeSingle();
    if (!contact) return NextResponse.json({ unsubscribed: false }, { status: 404 });
    const p = url.searchParams.get("p") ?? "all";
    if ((PURPOSES as readonly string[]).includes(p)) {
      await recordConsent(service, { contactId: contact.id, purpose: p as Purpose, action: "withdraw", source: "email header", method: "one_click" });
    } else {
      await stopEverything(service, { id: contact.id, email: contact.email }, "one_click", "email header");
    }
    return NextResponse.json({ unsubscribed: true });
  }

  const result = await unsubscribe(service, {
    alert: url.searchParams.get("a") ?? undefined,
    rider: url.searchParams.get("r") ?? undefined,
    waitlist: url.searchParams.get("w") ?? undefined,
  });
  return NextResponse.json({ unsubscribed: result !== "unknown" }, { status: result === "unknown" ? 404 : 200 });
}
