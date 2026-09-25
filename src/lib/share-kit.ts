import type { SupabaseClient } from "@supabase/supabase-js";
import { profilePath } from "@/lib/page-paths";

/**
 * The share kit's tracked links (The Marketing Engine M4): one /go/ link per
 * piece, per professional, so "Promote yourself" can show how many people
 * each piece brought. Made the first time the tab opens.
 */
export const KIT = [
  { kind: "share", label: "Share images", to: (slug: string) => profilePath(slug) },
  { kind: "poster", label: "Poster", to: (slug: string) => profilePath(slug) },
  { kind: "card", label: "Business card", to: (slug: string) => profilePath(slug) },
  { kind: "badge", label: "Website badge", to: (slug: string) => profilePath(slug) },
  { kind: "signature", label: "Email signature", to: (slug: string) => profilePath(slug) },
  { kind: "follow", label: "Follow link", to: (slug: string) => `${profilePath(slug)}/follow` },
  { kind: "review", label: "Review link", to: (slug: string) => `/review/${slug}` },
] as const;
export type KitKind = (typeof KIT)[number]["kind"];

export type KitLink = { kind: KitKind; label: string; slug: string; clicks: number; recent: number };

/** Every piece's link for this provider, made if missing, with its clicks. Service role. */
export async function shareKitLinks(service: SupabaseClient, provider: { id: string; slug: string }): Promise<KitLink[]> {
  const { data: existing } = await service.from("links").select("id, slug, kind").eq("provider_id", provider.id);
  const have = new Map((existing ?? []).map((l) => [l.kind as string, l]));
  for (const k of KIT) {
    if (have.has(k.kind)) continue;
    const base = `${provider.slug}-${k.kind}`.slice(0, 60).replace(/-+$/, "");
    let slug = base;
    for (let i = 2; i < 20; i++) {
      const { error } = await service.from("links").insert({
        slug,
        label: `${provider.slug}: ${k.label.toLowerCase()}`,
        destination: k.to(provider.slug),
        utm_source: k.kind,
        utm_medium: "share-kit",
        utm_campaign: provider.slug.slice(0, 60),
        provider_id: provider.id,
        kind: k.kind,
      });
      if (!error) break;
      if (error.code !== "23505") throw error;
      // The (provider, kind) pair exists already (another request made it): stop; else the slug's taken: try the next.
      const { data: again } = await service.from("links").select("id").eq("provider_id", provider.id).eq("kind", k.kind).maybeSingle();
      if (again) break;
      slug = `${base.slice(0, 56)}-${i}`;
    }
  }
  const { data: links } = await service.from("links").select("id, slug, kind").eq("provider_id", provider.id);
  const ids = (links ?? []).map((l) => l.id);
  const { data: clicks } = ids.length ? await service.from("link_clicks").select("link_id, day").in("link_id", ids) : { data: [] };
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  return KIT.map((k) => {
    const l = (links ?? []).find((x) => x.kind === k.kind);
    const mine = (clicks ?? []).filter((c) => c.link_id === l?.id);
    return { kind: k.kind, label: k.label, slug: (l?.slug as string) ?? "", clicks: mine.length, recent: mine.filter((c) => c.day >= since).length };
  });
}
