import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { sendEnquiryFollowups } from "@/lib/reviews";
import { cronAuthorized } from "@/lib/cron-auth";

// "Did you end up booking?" (src/lib/reviews.ts), daily. Vercel Cron in
// vercel.json; call by hand with the CRON_SECRET header until deployed.
// Safe to run twice: each enquiry is asked once.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = createServiceSupabase();
  if (!service) return NextResponse.json({ error: "No service role key." }, { status: 503 });
  return NextResponse.json(await sendEnquiryFollowups(service));
}
