import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { getProfessions } from "@/lib/cms/read";

/**
 * The waitlist as a CSV, for the email that goes out at launch.
 *
 * Checks is_admin() itself rather than trusting the admin layout: this is a
 * route handler, not a page inside that layout, and it hands over every
 * address on the list. Anyone who has unsubscribed is left out, so the file
 * can be mailed as it stands without re-filtering.
 */
export async function GET() {
  const supabase = await createClient();
  if (!supabase) return new Response("Not available", { status: 503 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return new Response("Not found", { status: 404 });

  const service = createServiceSupabase();
  if (!service) return new Response("Not available", { status: 503 });

  const [{ data: rows }, professions] = await Promise.all([
    service
      .from("waitlist")
      .select("email, role, profession_id, source, created_at")
      .is("unsubscribed_at", null)
      .order("created_at", { ascending: true }),
    getProfessions(),
  ]);
  const professionName = new Map(professions.map((p) => [p.id ?? p.slug, p.name]));

  // Quote every field and double any quote inside it. A name or a trade can
  // hold a comma, and a spreadsheet reading one row as two is silent.
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Email", "They are", "Profession", "Source", "Signed up"];
  const roleLabel: Record<string, string> = { rider: "Rider or owner", coach: "Riding coach", horse_care: "Horse care professional" };
  const lines = [
    header.map(cell).join(","),
    ...(rows ?? []).map((r) =>
      [
        r.email,
        roleLabel[String(r.role)] ?? r.role,
        r.profession_id ? (professionName.get(String(r.profession_id)) ?? "") : "",
        r.source,
        String(r.created_at).slice(0, 10),
      ]
        .map(cell)
        .join(",")
    ),
  ];

  const today = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      // The BOM above is what makes Excel open a UTF-8 CSV as UTF-8.
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waitlist-${today}.csv"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
