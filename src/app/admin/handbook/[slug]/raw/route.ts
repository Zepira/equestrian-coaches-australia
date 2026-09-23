import { createClient } from "@/lib/supabase/server";
import { getHandbookDoc } from "@/lib/handbook";
import { buildHandbookFrameHtml, readHandbookDoc } from "@/lib/handbook-content";

/**
 * Serves a handbook document as a standalone HTML page, for the iframe on
 * /admin/handbook/[slug] to load.
 *
 * The admin layout does not protect route handlers, so this checks is_admin()
 * itself. Without that, the planning documents — which contain the partnership
 * split, the pricing that has not been announced, and Kim's unfinished bio —
 * would be readable by anyone who guessed the URL.
 */
const notFound = () =>
  new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient();
  if (!supabase) return notFound();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return notFound();

  const { slug } = await params;
  const doc = getHandbookDoc(slug);
  if (!doc) return notFound();

  let source: string;
  try {
    source = await readHandbookDoc(doc);
  } catch {
    return notFound();
  }

  return new Response(buildHandbookFrameHtml(source), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      // Only our own admin page may frame this.
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}
