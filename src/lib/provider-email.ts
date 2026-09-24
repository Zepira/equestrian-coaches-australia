import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import { getPlanCapabilities } from "@/lib/settings";
import { profileCompleteness } from "@/lib/coach-stats";
import { hasVideo } from "@/lib/tiers";
import { absoluteUrl } from "@/lib/site-url";
import { profilePath } from "@/lib/page-paths";

/**
 * The monthly numbers email (The Site as a CMS §08.2), on the 1st, about the
 * month just gone. Its words are the `email.monthly` content block, with the
 * profession's nouns as variables ("riders" or "horse owners"). Good months
 * and quiet months get the same email; a quiet one says so and names the two
 * things most likely to change it. It asks about outcomes when there were
 * enquiries, lists what people nearby searched for, and names the one
 * profile gap worth fixing. Someone in two professions sees each section's
 * numbers. Once per provider per month (provider_month_stats.emailed_at).
 */
type Service = SupabaseClient;
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
type Row = { profession_id: string | null; impressions: number; views: number; reveals: number; enquiries: number; emailed_at: string | null };

export async function sendProviderMonthly(service: Service, now = new Date()) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const month = monthStart.toISOString().slice(0, 10);
  const monthName = monthStart.toLocaleString("en-AU", { month: "long", timeZone: "UTC" });
  await service.rpc("freeze_month_stats", { p_month: month });

  const [copy, professions, caps] = await Promise.all([getContent("email.monthly"), getProfessions(), getPlanCapabilities()]);
  const { data: providers } = await service
    .from("providers")
    .select("id, slug, name, bio, lat, video_url, provider_terms(sort_order, terms(id, kind)), provider_members(profiles(email)), subscriptions(tier, status)")
    .eq("status", "published");

  let sent = 0;
  let skipped = 0;
  for (const p of providers ?? []) {
    const terms = ((p as unknown as { provider_terms: { sort_order: number; terms: { id: string; kind: string } | null }[] }).provider_terms ?? [])
      .filter((t) => t.terms)
      .sort((a, b) => a.sort_order - b.sort_order);
    const professionIds = terms.filter((t) => t.terms!.kind === "profession").map((t) => t.terms!.id);
    const profession = professions.find((x) => x.id === professionIds[0]) ?? professions.find((x) => x.slug === "coaches")!;
    const emails = ((p as unknown as { provider_members: { profiles: { email: string | null } | null }[] }).provider_members ?? [])
      .map((m) => m.profiles?.email)
      .filter((e): e is string => Boolean(e));
    if (!emails.length) continue;

    let { data: rows } = await service.from("provider_month_stats").select("profession_id, impressions, views, reveals, enquiries, emailed_at").eq("provider_id", p.id).eq("month", month);
    if ((rows ?? []).some((r) => r.emailed_at)) {
      skipped++;
      continue;
    }
    if (!rows?.length) {
      // A month with nothing in it still gets its email, and a row to record it.
      await service.from("provider_month_stats").insert({ provider_id: p.id, profession_id: profession.id, month, frozen_at: new Date().toISOString() });
      rows = [{ profession_id: profession.id, impressions: 0, views: 0, reveals: 0, enquiries: 0, emailed_at: null }];
    }
    const total = (rows as Row[]).reduce(
      (t, r) => ({ impressions: t.impressions + r.impressions, views: t.views + r.views, reveals: t.reveals + r.reveals, enquiries: t.enquiries + r.enquiries }),
      { impressions: 0, views: 0, reveals: 0, enquiries: 0 }
    );
    const quiet = total.views + total.reveals + total.enquiries === 0;

    const [{ count: photos }, { count: testimonials }, { data: searches }] = await Promise.all([
      service.from("provider_photos").select("id", { count: "exact", head: true }).eq("provider_id", p.id),
      service.from("testimonials").select("id", { count: "exact", head: true }).eq("provider_id", p.id),
      service.rpc("local_search_terms", { p_provider_id: p.id, p_from: monthStart.toISOString(), p_to: monthEnd.toISOString() }),
    ]);
    const sub = (p as unknown as { subscriptions: { tier: string | null; status: string } | { tier: string | null; status: string }[] | null }).subscriptions;
    const plan = Array.isArray(sub) ? sub[0] : sub;
    const { next } = profileCompleteness(
      {
        hasPhoto: (photos ?? 0) > 0,
        bio: String(p.bio ?? ""),
        termCount: terms.filter((t) => t.terms!.kind === "discipline").length,
        hasLocation: p.lat != null,
        testimonialCount: testimonials ?? 0,
        hasVideo: Boolean(p.video_url),
        videoAllowed: hasVideo(plan?.tier, plan?.status, caps),
      },
      profession.completeness
    );

    const vars = {
      first_name: String(p.name).split(" ")[0],
      month: monthName,
      searches: count(total.impressions, "search", "searches"),
      people_viewed: count(total.views, "person", "people"),
      people_tapped: count(total.reveals, "person", "people"),
      people_enquired: count(total.enquiries, "person", "people"),
      view_count: count(total.views, "profile view", "profile views"),
      enquiry_count: count(total.enquiries, "enquiry", "enquiries"),
      audience: `${profession.audienceNoun}s`,
      next_step: next?.label ?? "",
      // Plain numbers under the first version's names, so copy saved before
      // the counted variables existed still reads rather than showing {views}.
      impressions: String(total.impressions),
      views: String(total.views),
      reveals: String(total.reveals),
      enquiries: String(total.enquiries),
      dashboard_url: absoluteUrl("/dashboard"),
      profile_url: absoluteUrl(profilePath(p.slug)),
    };
    const f = (t: string) => fillVariables(t, vars);
    const parts = [`Hi ${vars.first_name},`, f(quiet ? copy.quietIntro : copy.busyIntro)];
    if ((rows as Row[]).length > 1) {
      parts.push(
        (rows as Row[])
          .map((r) => {
            const x = professions.find((y) => y.id === r.profession_id);
            return `As ${/^[aeiou]/i.test(x?.singular ?? "") ? "an" : "a"} ${x?.singular ?? "professional"}: ${count(r.views, "view", "views")}, ${count(r.reveals, "tap to call", "taps to call")}, ${count(r.enquiries, "enquiry", "enquiries")}.`;
          })
          .join("\n")
      );
    }
    if (total.enquiries > 0) parts.push(f(copy.outcome));
    const terms3 = (searches ?? []) as { term: string; place: string; searches: number }[];
    if (terms3.length) parts.push(`${f(copy.searches)}\n${terms3.map((s) => `- ${s.term} near ${s.place} (${s.searches})`).join("\n")}`);
    if (next) parts.push(f(copy.nextStep));
    if (quiet) parts.push(f(copy.share));
    parts.push(f(copy.signOff));

    const result = await sendEmail({ to: emails, subject: f(copy.subject), text: parts.join("\n\n") });
    if (result === "failed") continue;
    if (result === "sent") sent++;
    await service.from("provider_month_stats").update({ emailed_at: new Date().toISOString() }).eq("provider_id", p.id).eq("month", month);
  }
  return { month, providers: (providers ?? []).length, sent, skipped };
}
