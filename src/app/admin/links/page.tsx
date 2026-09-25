import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { changeLog } from "@/lib/admin";
import { absoluteUrl } from "@/lib/site-url";
import { HistoryList } from "../history-list";
import { createLink, setLinkArchived } from "./actions";

export const metadata = { title: "Links and sources" };

type LinkRow = { id: string; slug: string; label: string; destination: string; utm_source: string; utm_medium: string; utm_campaign: string; archived: boolean; created_at: string };
type Touch = { source?: string } | null;

const month = (iso: string) => iso.slice(0, 7);
/** Dates for the report, outside render (the lint rule on impure calls). */
function thirtyDaysAgo() {
  return new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
}
function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}
const monthName = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-AU", { month: "short", year: "numeric", timeZone: "UTC" });

/**
 * /admin/links (The Marketing Engine M2): make a tracked /go/ link for each
 * channel (a Facebook group, a partner, a poster) and download its QR code;
 * then the report the month-eight question needs: sign-ups, finished
 * profiles and paying professionals, by where people first came from.
 */
export default async function AdminLinksPage({ searchParams }: { searchParams: Promise<{ made?: string; error?: string }> }) {
  const { made, error } = await searchParams;
  const supabase = await createClient();
  const service = createServiceSupabase();
  if (!supabase || !service) return null;

  const since = thirtyDaysAgo();
  const [{ data: links }, { data: clicks }, { data: contacts }, { data: providers }, history] = await Promise.all([
    supabase.from("links").select("id, slug, label, destination, utm_source, utm_medium, utm_campaign, archived, created_at").order("created_at", { ascending: false }),
    service.from("link_clicks").select("link_id, day"),
    service.from("contacts").select("profile_id, first_touch, created_at, profiles(role, created_at)"),
    service.from("providers").select("id, acquisition_source, submitted_at, provider_members(user_id), subscriptions(status, founding)"),
    changeLog(supabase, { table: "links" }),
  ]);
  const clickTotal = new Map<string, { all: number; recent: number }>();
  for (const c of clicks ?? []) {
    const t = clickTotal.get(c.link_id) ?? { all: 0, recent: 0 };
    t.all++;
    if (c.day >= since) t.recent++;
    clickTotal.set(c.link_id, t);
  }

  // The report: each account's first source (from its contact), by the month it joined.
  const sourceOf = new Map<string, string>();
  const rows: Record<string, Record<string, { riders: number; pros: number; finished: number; paying: number }>> = {};
  const bump = (src: string, ym: string, k: "riders" | "pros" | "finished" | "paying") => {
    rows[src] ??= {};
    rows[src][ym] ??= { riders: 0, pros: 0, finished: 0, paying: 0 };
    rows[src][ym][k]++;
  };
  for (const c of contacts ?? []) {
    const profile = (c as unknown as { profiles: { role: string; created_at: string } | null }).profiles;
    if (!c.profile_id || !profile) continue;
    const src = (c.first_touch as Touch)?.source || "direct";
    sourceOf.set(c.profile_id, src);
    bump(src, month(profile.created_at), profile.role === "provider" ? "pros" : "riders");
  }
  for (const p of providers ?? []) {
    const member = (p as unknown as { provider_members: { user_id: string }[] }).provider_members[0]?.user_id;
    const src = (member && sourceOf.get(member)) || p.acquisition_source?.split(";")[0]?.replace(/^(ref|utm_source)=/, "") || "direct";
    const sub = (p as unknown as { subscriptions: { status: string; founding: boolean } | { status: string; founding: boolean }[] | null }).subscriptions;
    const s = Array.isArray(sub) ? sub[0] : sub;
    if (p.submitted_at) bump(src, month(p.submitted_at), "finished");
    if (s?.status === "active") bump(src, thisMonth(), "paying");
  }
  const months = [...new Set(Object.values(rows).flatMap((r) => Object.keys(r)))].sort().reverse().slice(0, 6);
  const sources = Object.keys(rows).sort();
  const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Links and sources</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          One link per place you share the site: each Facebook group, each partner, each poster. It counts the clicks, remembers where people came from, and the report below shows who joined through it.
        </p>
      </div>

      <section className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
        <h3 className="font-display text-[20px] leading-none text-ink">Make a link</h3>
        {error && <p role="alert" className="mt-3 text-[14px] text-danger">{error}</p>}
        {made && <p role="status" className="mt-3 text-[14px] text-success">Made: {absoluteUrl(`/go/${made}`)}</p>}
        <form action={createLink} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[14px] font-medium text-fg">Name</span>
            <input name="label" required maxLength={80} placeholder="Kim's post in Western Riders Victoria" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Address after /go/</span>
            <input name="slug" maxLength={60} placeholder="western-riders-vic (made from the name if empty)" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Goes to</span>
            <input name="destination" defaultValue="/" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Source</span>
            <input name="utm_source" placeholder="facebook-western-vic" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Kind of channel</span>
            <input name="utm_medium" placeholder="social, poster, partner, press" className={input} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[14px] font-medium text-fg">Campaign (optional)</span>
            <input name="utm_campaign" placeholder="launch" className={input} />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Make the link</Button>
          </div>
        </form>
      </section>

      <section>
        <h3 className="font-display text-[20px] leading-none text-ink">Links</h3>
        <ul className="mt-3 flex flex-col gap-2 text-[14px]" data-links>
          {((links ?? []) as LinkRow[]).map((l) => {
            const c = clickTotal.get(l.id) ?? { all: 0, recent: 0 };
            return (
              <li key={l.id} className={`flex flex-col gap-1.5 rounded-[12px] border border-border bg-surface px-3 py-2.5 sm:flex-row sm:items-center ${l.archived ? "opacity-55" : ""}`} data-link={l.slug}>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-fg">{l.label}</div>
                  <div className="font-mono text-[12px] text-subtle">
                    /go/{l.slug} → {l.destination} · {l.utm_source}/{l.utm_medium}
                    {l.utm_campaign ? `/${l.utm_campaign}` : ""}
                  </div>
                </div>
                <span className="text-[13px] text-muted">{c.recent} in 30 days · {c.all} in all</span>
                <div className="flex gap-3 text-[13px]">
                  <a href={`/admin/links/${l.slug}/qr`} className="font-medium text-accent">QR code</a>
                  <form action={setLinkArchived.bind(null, l.id, !l.archived)}>
                    <button className="text-subtle hover:text-fg">{l.archived ? "Use again" : "Archive"}</button>
                  </form>
                </div>
              </li>
            );
          })}
          {(links ?? []).length === 0 && <li className="text-subtle">None yet.</li>}
        </ul>
      </section>

      <section>
        <h3 className="font-display text-[20px] leading-none text-ink">Where people came from</h3>
        <p className="mt-1.5 text-[13px] text-subtle">
          By the first source we saw for them, and the month it happened. &ldquo;Direct&rdquo; is anyone who arrived without a tracked link. Paying counts professionals on a paid plan now.
        </p>
        {sources.length === 0 ? (
          <p className="mt-2 text-[14px] text-subtle">Nothing yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]" data-sources>
              <thead>
                <tr className="border-b border-border text-subtle">
                  <th className="py-2 pr-3 font-medium">Source</th>
                  {months.map((m) => (
                    <th key={m} className="py-2 pr-3 font-medium">{monthName(m)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((src) => (
                  <tr key={src} className="border-b border-border align-top">
                    <td className="py-2 pr-3 font-medium text-fg">{src}</td>
                    {months.map((m) => {
                      const r = rows[src][m];
                      return (
                        <td key={m} className="py-2 pr-3 text-muted">
                          {r ? `${r.riders} riders, ${r.pros} professionals, ${r.finished} finished, ${r.paying} paying` : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[13px] text-subtle">
        Any address with <code>?utm_source=</code> or <code>?ref=</code> counts too, so the <Link href="/admin/invites" className="underline">invite</Link> and <code>/join/</code> links Kim already sends show up here.
      </p>

      <HistoryList rows={history} />
    </div>
  );
}
