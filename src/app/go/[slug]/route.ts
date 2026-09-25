import { NextResponse, type NextRequest } from "next/server";
import { createPublicSupabase } from "@/lib/supabase/public";
import { createServiceSupabase } from "@/lib/supabase/service";
import { visitorHash } from "@/lib/coach-events";
import { FIRST_TOUCH, setTouchCookies, touchFromParams } from "@/lib/touch";

/**
 * /go/[slug] (The Marketing Engine M2): a tracked link for one channel (a
 * Facebook group, a poster, a partner). Counts the click once per visitor a
 * day, records where the visitor came from, and sends them on with the utm
 * tags added. An unknown or archived link goes to the home page.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = createPublicSupabase();
  const { data: link } = db
    ? await db.from("links").select("id, slug, destination, utm_source, utm_medium, utm_campaign, archived").eq("slug", slug.toLowerCase()).maybeSingle()
    : { data: null };
  if (!link || link.archived) return NextResponse.redirect(new URL("/", request.url));

  const service = createServiceSupabase();
  const hash = await visitorHash();
  if (service && hash) {
    await service.from("link_clicks").upsert({ link_id: link.id, visitor_hash: hash }, { onConflict: "link_id,visitor_hash,day", ignoreDuplicates: true });
  }

  const to = new URL(link.destination, request.url);
  to.searchParams.set("utm_source", link.utm_source);
  to.searchParams.set("utm_medium", link.utm_medium);
  if (link.utm_campaign) to.searchParams.set("utm_campaign", link.utm_campaign);
  const response = NextResponse.redirect(to);
  const touch = touchFromParams(to.searchParams, link.slug);
  if (touch) setTouchCookies(response, touch, request.cookies.has(FIRST_TOUCH));
  return response;
}
