import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { audienceCount, describeFilter, type AudienceFilter } from "@/lib/campaigns";
import { createAudience, createCampaign } from "./actions";

export const metadata = { title: "Campaigns" };

const STATUS: Record<string, string> = { draft: "Draft", scheduled: "Scheduled", sending: "Sending", sent: "Sent", cancelled: "Stopped" };
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

/**
 * /admin/campaigns (The Marketing Engine M8, Grow): one-off emails to a
 * saved audience. Each audience shows how many it matches and how many of
 * them can be emailed, after consent and the do-not-email list.
 */
export default async function AdminCampaignsPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { done, error } = await searchParams;
  const service = createServiceSupabase();
  if (!service) return null;
  const [{ data: campaigns }, { data: audiences }] = await Promise.all([
    service.from("campaigns").select("id, name, status, scheduled_at, sent_at, audience_id, created_at").order("created_at", { ascending: false }).limit(50),
    service.from("audiences").select("id, name, filter").order("created_at", { ascending: false }),
  ]);
  const counted = await Promise.all(
    (audiences ?? []).map(async (a) => ({ ...a, words: await describeFilter(a.filter as AudienceFilter), count: await audienceCount(service, a.filter as AudienceFilter) }))
  );
  const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Campaigns</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          One-off emails to a group: the spring clinic season, a profession opening near someone, news for professionals. Only people who agreed to that kind of email get it, and every one carries the unsubscribe link.
        </p>
      </div>
      {done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{done}</p>}
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}

      <section>
        <h3 className="font-display text-[20px] leading-none text-ink">Campaigns</h3>
        <form action={createCampaign} className="mt-3 flex max-w-[520px] gap-2">
          <input name="name" required placeholder="Spring clinics, Victoria" className={input} aria-label="Campaign name" />
          <Button type="submit">New campaign</Button>
        </form>
        <ul className="mt-3 flex flex-col text-[14px]" data-campaign-list>
          {(campaigns ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
              <Link href={`/admin/campaigns/${c.id}`} className="font-medium text-accent">{c.name}</Link>
              <span className="text-subtle">
                {STATUS[c.status] ?? c.status}
                {c.status === "scheduled" && c.scheduled_at ? `, ${when(c.scheduled_at)}` : c.sent_at ? `, ${when(c.sent_at)}` : ""}
              </span>
            </li>
          ))}
          {(campaigns ?? []).length === 0 && <li className="text-subtle">None yet.</li>}
        </ul>
      </section>

      <section className="border-t border-border pt-6">
        <h3 className="font-display text-[20px] leading-none text-ink">Audiences</h3>
        <form action={createAudience} className="mt-3 flex max-w-[520px] gap-2">
          <input name="name" required placeholder="Riders near Bendigo" className={input} aria-label="Audience name" />
          <Button type="submit" variant="secondary">New audience</Button>
        </form>
        <ul className="mt-3 flex flex-col text-[14px]" data-audience-list>
          {counted.map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
              <span>
                <Link href={`/admin/campaigns/audiences/${a.id}`} className="font-medium text-accent">{a.name}</Link>
                <span className="block text-[13px] text-subtle">{a.words}</span>
              </span>
              <span className="text-subtle">{a.count.sendable} can be emailed, of {a.count.matched}</span>
            </li>
          ))}
          {counted.length === 0 && <li className="text-subtle">None yet.</li>}
        </ul>
      </section>
    </div>
  );
}
