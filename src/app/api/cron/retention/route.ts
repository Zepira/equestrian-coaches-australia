import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { getEnquiryRetentionMonths } from "@/lib/settings";

// Deletes the name, contact details and message of enquiries older than the
// enquiry_retention_months setting (the privacy policy says so), keeping the
// row so a professional's counts stay right. Daily; sends nothing. Vercel
// Cron in vercel.json; call by hand with the CRON_SECRET header until deployed.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = createServiceSupabase();
  if (!service) return NextResponse.json({ error: "No service role key." }, { status: 503 });
  const months = await getEnquiryRetentionMonths();
  const { data, error } = await service.rpc("redact_old_enquiries", { p_months: months });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ months, redacted: data });
}
