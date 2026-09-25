import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Every link in a campaign email (The Marketing Engine M8). Logs the click
 * against that reader's send, then redirects with the campaign's utm tags,
 * so a sign-up that follows is traced back to it. Only two kinds of target:
 * a link the campaign itself holds (?n=, by position), or a path on this
 * site (?to=/...). Anything else goes home: this is never an open redirect.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  const service = createServiceSupabase();
  const home = NextResponse.redirect(absoluteUrl("/"), 302);
  if (!service || !/^[a-f0-9]{32,80}$/.test(token)) return home;
  const { data: send } = await service.from("campaign_sends").select("campaign_id, contact_id, campaigns(slug, sections)").eq("token", token).maybeSingle();
  if (!send) return home;
  const campaign = (send as unknown as { campaigns: { slug: string; sections: { type: string; url?: string }[] } }).campaigns;

  let target: URL | null = null;
  const to = url.searchParams.get("to");
  const n = url.searchParams.get("n");
  if (to && to.startsWith("/") && !to.startsWith("//") && !to.includes("\\")) target = new URL(absoluteUrl(to));
  else if (n != null && /^\d+$/.test(n)) {
    const raw = campaign.sections[Number(n)]?.url;
    try {
      if (raw) target = new URL(raw.startsWith("/") ? absoluteUrl(raw) : raw);
    } catch {
      target = null;
    }
  }
  if (!target || !/^https?:$/.test(target.protocol)) return home;

  await service.from("email_events").insert({ contact_id: send.contact_id, campaign_id: send.campaign_id, type: "clicked", link: target.toString().slice(0, 500) });
  // Our own pages get the tags that record where the visitor came from.
  if (target.origin === new URL(absoluteUrl("/")).origin) {
    target.searchParams.set("utm_source", "email");
    target.searchParams.set("utm_medium", "campaign");
    target.searchParams.set("utm_campaign", campaign.slug);
  }
  return NextResponse.redirect(target.toString(), 302);
}
