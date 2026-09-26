import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { sponsorReport } from "@/lib/sponsors";

/** A sponsor's monthly report as a CSV, to send them (M11). Admins only. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  if (!supabase || !(await supabase.rpc("is_admin")).data) return new NextResponse("Not found", { status: 404 });
  const { id } = await params;
  const service = createServiceSupabase();
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!service || !/^\d{4}-\d{2}$/.test(month)) return new NextResponse("Bad month", { status: 400 });
  const { data: sponsor } = await service.from("sponsors").select("name, slug").eq("id", id).maybeSingle();
  if (!sponsor) return new NextResponse("Not found", { status: 404 });
  const rows = await sponsorReport(service, id, month);
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [["Sponsor", "Month", "Where", "Headline", "Dates", "Shown", "Clicks"], ...rows.map((r) => [sponsor.name as string, month, r.where, r.headline, r.dates, r.views, r.clicks])]
    .map((line) => line.map(cell).join(","))
    .join("\r\n");
  return new NextResponse(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${sponsor.slug}-${month}.csv"` },
  });
}
