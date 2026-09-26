import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { sendProviderMonthly } from "@/lib/provider-email";
import { cronAuthorized } from "@/lib/cron-auth";

// The monthly numbers email to every published provider, about the month
// just gone (src/lib/provider-email.ts). Freezes that month's totals first.
// Vercel Cron in vercel.json; once per provider per month however often it runs.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = createServiceSupabase();
  if (!service) return NextResponse.json({ error: "No service role key." }, { status: 503 });
  return NextResponse.json(await sendProviderMonthly(service));
}
