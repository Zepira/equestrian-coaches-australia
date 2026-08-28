import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Nightly eligibility recompute for indexable_pages (see
// supabase/migrations/0012_indexable_pages.sql). The sitemap and the
// /riding-instructors/[area] and /disciplines/[slug]/[area] routes all
// read this table rather than recomputing coach counts on every request.
// Configure as a Vercel Cron job (see vercel.json) once deployed; call
// manually with the CRON_SECRET header until then.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.rpc("recompute_indexable_pages");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count: eligibleCount } = await supabase
    .from("indexable_pages")
    .select("*", { count: "exact", head: true })
    .eq("eligible", true);

  return NextResponse.json({ eligiblePages: eligibleCount ?? 0 });
}
