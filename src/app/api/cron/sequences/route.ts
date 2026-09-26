import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { runSequences } from "@/lib/sequences";
import { cronAuthorized } from "@/lib/cron-auth";

// Sequences (src/lib/sequences.ts). Daily on Vercel Hobby; hourly once on Pro. Vercel Cron in
// vercel.json; call by hand with the CRON_SECRET header until deployed.
// Safe to run twice: each step goes once per run.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = createServiceSupabase();
  if (!service) return NextResponse.json({ error: "No service role key." }, { status: 503 });
  return NextResponse.json(await runSequences(service));
}
