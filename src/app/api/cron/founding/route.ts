import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { runFoundingJob } from "@/lib/founding";
import { cronAuthorized } from "@/lib/cron-auth";

// Daily: reminders 30, 14 and 3 days before a founding member's first
// charge, and (mock payments only) the move from the free period to the
// founding Listed plan. See src/lib/founding.ts. Vercel Cron in vercel.json;
// call by hand with the CRON_SECRET header until deployed.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = createServiceSupabase();
  if (!service) return NextResponse.json({ error: "No service role key." }, { status: 503 });
  return NextResponse.json(await runFoundingJob(service));
}
