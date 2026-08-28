import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notifyRidersOfClinic } from "@/lib/notifications";

// Backstop for the inline send in createClinic (src/app/dashboard/clinics/
// actions.ts) — re-runs matching for recent clinics so a rider who saves
// their preferences *after* a clinic was created still gets notified, and
// so a failed inline send gets retried. notifications_log dedupes either
// way. Configure as a Vercel Cron job (see vercel.json) once deployed;
// call manually with the CRON_SECRET header until then.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: clinics, error } = await supabase
    .from("clinics")
    .select("id")
    .gte("created_at", sevenDaysAgo);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let totalSent = 0;
  let totalMatched = 0;
  for (const clinic of clinics ?? []) {
    const result = await notifyRidersOfClinic(clinic.id);
    totalSent += result.sent;
    totalMatched += result.matched;
  }

  return NextResponse.json({ clinicsChecked: clinics?.length ?? 0, totalMatched, totalSent });
}
