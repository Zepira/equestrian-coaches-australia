import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/site-url";

/**
 * A tracked link's QR code, as an SVG to download for a poster or card
 * (The Marketing Engine M2). Admins only.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: isAdmin } = supabase ? await supabase.rpc("is_admin") : { data: false };
  if (!isAdmin) return new Response("Not found", { status: 404 });
  const svg = await QRCode.toString(absoluteUrl(`/go/${slug}`), { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#14281f", light: "#ffffff" } });
  return new Response(svg, {
    headers: { "content-type": "image/svg+xml", "content-disposition": `attachment; filename="go-${slug}.svg"` },
  });
}
