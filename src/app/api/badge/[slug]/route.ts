import { createPublicSupabase } from "@/lib/supabase/public";

/**
 * The website badge (The Marketing Engine M4): a small image a professional
 * puts on their own site, linking to their profile through their tracked
 * link. Public, since it's shown on other sites.
 */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug.replace(/\.svg$/, "");
  const db = createPublicSupabase();
  const { data: p } = db ? await db.from("providers").select("name").eq("slug", slug).eq("status", "published").maybeSingle() : { data: null };
  if (!p) return new Response("Not found", { status: 404 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64" role="img" aria-label="Find ${esc(p.name)} on Equine Professionals Australia">
  <rect width="240" height="64" rx="14" fill="#14281f"/>
  <text x="18" y="26" font-family="Helvetica, Arial, sans-serif" font-size="11" letter-spacing="1.2" fill="#E8B79A">FIND ME ON</text>
  <text x="18" y="46" font-family="Georgia, 'Times New Roman', serif" font-size="16" fill="#F6F1E7">Equine Professionals Australia</text>
</svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
}
