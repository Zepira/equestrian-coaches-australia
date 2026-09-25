import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { advanceCampaigns } from "@/lib/campaigns";

// Campaigns due or part way (src/lib/campaigns.ts). Daily on Vercel Hobby; hourly once on Pro. Vercel Cron in
// vercel.json; call by hand with the CRON_SECRET header until deployed.
// Safe to run twice: each person gets a campaign once.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = createServiceSupabase();
  if (!service) return NextResponse.json({ error: "No service role key." }, { status: 503 });
  return NextResponse.json(await advanceCampaigns(service));
}
