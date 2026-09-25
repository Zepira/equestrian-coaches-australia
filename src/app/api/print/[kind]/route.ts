import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { requireProvider } from "@/lib/provider-session";
import { createServiceSupabase } from "@/lib/supabase/service";
import { getProfessions } from "@/lib/cms/read";
import { shareKitLinks } from "@/lib/share-kit";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Printables from "Promote yourself" (The Marketing Engine M4), for the
 * signed-in professional: /api/print/poster (A4, for a noticeboard) and
 * /api/print/card (business-card size). Each QR code is their own tracked
 * link, so the dashboard counts what the poster brought.
 */
const INK = rgb(0.078, 0.157, 0.122);
const MM = 72 / 25.4;

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== "poster" && kind !== "card") return new Response("Not found", { status: 404 });
  // Signed-in professionals only; anyone else gets a plain refusal, not an error page.
  const session = await requireProvider().catch(() => null);
  if (!session) return new Response("Sign in to download this.", { status: 401 });
  const { providerId, provider } = session;
  const service = createServiceSupabase();
  if (!service) return new Response("Unavailable", { status: 503 });
  const links = await shareKitLinks(service, { id: providerId, slug: provider.slug as string });
  const link = absoluteUrl(`/go/${links.find((l) => l.kind === kind)!.slug}`);
  const { data: terms } = await service.from("provider_terms").select("sort_order, terms!inner(slug, kind)").eq("provider_id", providerId).eq("terms.kind", "profession").order("sort_order");
  const professionSlug = (terms?.[0] as unknown as { terms: { slug: string } } | undefined)?.terms.slug ?? "coaches";
  const singular = (await getProfessions()).find((p) => p.slug === professionSlug)?.singular ?? "professional";
  const name = String(provider.name);
  const place = [provider.suburb, provider.state].filter(Boolean).join(" ");

  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const qr = await pdf.embedPng(await QRCode.toBuffer(link, { margin: 1, width: 600, color: { dark: "#14281f", light: "#ffffff" } }));

  if (kind === "poster") {
    const page = pdf.addPage([210 * MM, 297 * MM]);
    const { width, height } = page.getSize();
    const centre = (text: string, size: number, y: number, font = serif) => page.drawText(text, { x: (width - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color: INK });
    centre("Find me on", 26, height - 110, sans);
    centre("Equine Professionals Australia", 34, height - 150);
    centre(name, 54, height - 250);
    centre(`${singular.charAt(0).toUpperCase()}${singular.slice(1)}${place ? `, ${place}` : ""}`, 22, height - 290, sans);
    const q = 300;
    page.drawImage(qr, { x: (width - q) / 2, y: height - 330 - q - 20, width: q, height: q });
    centre("Scan to see my profile and get in touch.", 18, 170, sans);
    centre(link.replace(/^https?:\/\//, ""), 14, 140, sans);
  } else {
    const page = pdf.addPage([90 * MM, 55 * MM]);
    const { height } = page.getSize();
    const q = 42 * MM;
    page.drawImage(qr, { x: 44 * MM, y: (height - q) / 2, width: q, height: q });
    page.drawText(name, { x: 5 * MM, y: height - 14 * MM, size: 13, font: serif, color: INK, maxWidth: 38 * MM });
    page.drawText(singular, { x: 5 * MM, y: height - 20 * MM, size: 8, font: sans, color: INK });
    if (place) page.drawText(place, { x: 5 * MM, y: height - 24 * MM, size: 8, font: sans, color: INK });
    page.drawText("Find me on", { x: 5 * MM, y: 11 * MM, size: 7, font: sans, color: INK });
    page.drawText("Equine Professionals Australia", { x: 5 * MM, y: 7 * MM, size: 7.5, font: serif, color: INK });
  }
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${provider.slug}-${kind}.pdf"` },
  });
}
