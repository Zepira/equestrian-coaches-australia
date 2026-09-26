import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { sendRiderMonthly } from "@/lib/rider-email";
import { cronAuthorized } from "@/lib/cron-auth";

// The monthly rider email (src/lib/rider-email.ts), on the 1st. Vercel Cron
// in vercel.json; call by hand with the CRON_SECRET header until deployed.
// Safe to run twice in a month: each rider gets one.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = createServiceSupabase();
  if (!service) return NextResponse.json({ error: "No service role key." }, { status: 503 });
  return NextResponse.json(await sendRiderMonthly(service));
}
