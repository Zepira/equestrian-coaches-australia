import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { audienceCount, audienceMembers, campaignResults, describeFilter, renderCampaign, SECTION_TYPES, type AudienceFilter, type Section } from "@/lib/campaigns";
import { cancelCampaign, saveCampaign, scheduleCampaign, sendCampaignNow, sendCampaignTest } from "../actions";

export const metadata = { title: "Campaign" };

const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

/**
 * One campaign (M8): the words as fields, a preview as any named person in
 * the audience, a test to yourself, then schedule or send. Once it's gone,
 * the words lock and the results show.
 */
export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string; as?: string }> }) {
  const { id } = await params;
  const { done, error, as } = await searchParams;
  const service = createServiceSupabase();
  if (!service) return null;
  const [{ data: c }, { data: audiences }, { data: guides }] = await Promise.all([
    service.from("campaigns").select("*").eq("id", id).maybeSingle(),
    service.from("audiences").select("id, name, filter").order("name"),
    service.from("guides").select("id, title").eq("status", "published").order("title"),
  ]);
  if (!c) notFound();
  const sections = (c.sections ?? []) as Section[];
  const locked = !["draft", "scheduled"].includes(c.status);
  const audience = audiences?.find((a) => a.id === c.audience_id);
  const filter = (c.filter ?? audience?.filter ?? null) as AudienceFilter | null;
  const [count, words] = filter ? await Promise.all([audienceCount(service, filter), describeFilter(filter)]) : [null, ""];

  // Preview as a named person: someone in the audience, by email.
  let preview: { subject: string; text: string } | null = null;
  let previewNote = "";
  if (filter) {
    const members = await audienceMembers(service, filter);
    const who = as ? members.find((m) => m.email === as.trim().toLowerCase()) : members.find((m) => m.sendable) ?? members[0];
    if (as && !who) previewNote = `${as} isn't in this audience.`;
    if (who) {
      preview = await renderCampaign(service, { id: c.id, slug: c.slug, subject: c.subject, preview: c.preview, sections }, who, "");
      previewNote = `As ${who.name || who.email}${who.lat == null ? ", who has no place set, so nothing near them shows" : ""}${who.sendable ? "" : " (they wouldn't get it: no consent)"}.`;
    }
  }
  const results = c.started_at ? await campaignResults(service, { id: c.id, slug: c.slug, started_at: c.started_at, filter }) : null;
  const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";
  const label = "mb-1 block text-[13px] font-medium text-fg";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[14px]"><Link href="/admin/campaigns" className="text-accent">← Campaigns</Link></p>
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">{c.name}</h2>
        <p className="mt-1.5 text-[14px] text-muted" data-campaign-status>
          {c.status === "draft" && "Draft."}
          {c.status === "scheduled" && `Scheduled for ${when(c.scheduled_at)}.`}
          {c.status === "sending" && "Sending now."}
          {c.status === "sent" && `Sent ${when(c.sent_at)}.`}
          {c.status === "cancelled" && "Stopped part way."} Links carry utm_campaign={c.slug}.
        </p>
      </div>
      {done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{done}</p>}
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}

      {results && (
        <section className="rounded-[16px] border border-border bg-surface p-4 sm:p-5" data-results>
          <h3 className="font-display text-[20px] leading-none text-ink">Results</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-[14px] sm:grid-cols-4">
            {(
              [
                ["Sent", results.sent],
                ["Still to go", results.queued],
                ["Skipped (stopped since)", results.skipped],
                ["Delivered", results.delivered],
                ["Bounced", results.bounced],
                ["Clicked a link", results.clicked],
                ["Stopped emails within 14 days", results.stopped],
                ["Signed up from its links", results.signups],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-[12px] bg-shade p-3">
                <dt className="text-[12.5px] text-subtle">{k}</dt>
                <dd className="font-display text-[26px] leading-none text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[12.5px] text-subtle">
            Opens aren&rsquo;t counted: our emails are plain text, and open counts are unreliable anyway since Apple Mail opens everything. Delivered and bounced need Resend&rsquo;s webhook.
          </p>
          {(c.status === "sending") && (
            <form action={cancelCampaign.bind(null, id)} className="mt-3"><Button type="submit" variant="secondary">Stop sending</Button></form>
          )}
        </section>
      )}

      <form action={saveCampaign.bind(null, id)} className="flex flex-col gap-4" data-campaign-form>
        <fieldset disabled={locked} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Name (for us)</span><input name="name" defaultValue={c.name} className={input} /></label>
            <label><span className={label}>Audience</span>
              <select name="audience_id" defaultValue={c.audience_id ?? ""} className={input}>
                <option value="">Pick one</option>
                {(audiences ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          </div>
          {count && <p className="text-[13.5px] text-muted" data-campaign-count>{words}: <strong className="text-fg">{count.sendable}</strong> can be emailed, of {count.matched}.</p>}
          <label><span className={label}>Subject</span><input name="subject" defaultValue={c.subject} maxLength={150} className={input} /></label>
          <label><span className={label}>First line (most inboxes show it beside the subject)</span><input name="preview" defaultValue={c.preview} maxLength={300} className={input} /></label>
          <p className="text-[13px] text-subtle">{"{first_name}"} fills in the reader&rsquo;s first name in any text.</p>

          {sections.map((s, i) => (
            <fieldset key={i} className="rounded-[14px] border border-border p-3.5" data-section={s.type}>
              <input type="hidden" name={`s_${i}_type`} value={s.type} />
              <div className="flex flex-wrap items-center gap-3 text-[13px]">
                <strong className="text-fg">{SECTION_TYPES[s.type]}</strong>
                <label className="flex items-center gap-1.5 text-subtle">Order <input type="number" name={`s_${i}_order`} defaultValue={i} className="w-16 rounded-[8px] border border-border px-2 py-1" /></label>
                <label className="flex items-center gap-1.5 text-subtle"><input type="checkbox" name={`s_${i}_remove`} /> Remove</label>
              </div>
              {s.type === "text" && <textarea name={`s_${i}_body`} defaultValue={s.body} rows={5} className={`${input} mt-2`} />}
              {s.type === "button" && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input name={`s_${i}_label`} defaultValue={s.label} placeholder="See this spring's clinics" className={input} aria-label="Link words" />
                  <input name={`s_${i}_url`} defaultValue={s.url} placeholder="/coaches or https://..." className={input} aria-label="Link address" />
                </div>
              )}
              {s.type === "events" && <p className="mt-1.5 text-[13px] text-subtle">Up to five events in the next 60 days within 50 km of the reader. Left out for anyone with nothing near them.</p>}
              {s.type === "providers" && <p className="mt-1.5 text-[13px] text-subtle">Up to five professionals who went live in the last 30 days within 50 km of the reader.</p>}
              {s.type === "sponsor" && <p className="mt-1.5 text-[13px] text-subtle">The sponsor booked for the newsletter on the day it sends, labelled Sponsored. Left out if nobody is booked.</p>}
              {s.type === "guide" && (
                <select name={`s_${i}_guide`} defaultValue={s.guide_id} className={`${input} mt-2`}>
                  <option value="">Pick a published guide</option>
                  {(guides ?? []).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              )}
            </fieldset>
          ))}
          <label className="max-w-[320px]"><span className={label}>Add a section</span>
            <select name="add_type" defaultValue="" className={input}>
              <option value="">Nothing</option>
              {Object.entries(SECTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div><Button type="submit">Save</Button></div>
        </fieldset>
      </form>

      <section className="rounded-[16px] border border-border bg-surface p-4 sm:p-5" data-preview>
        <h3 className="font-display text-[20px] leading-none text-ink">Preview</h3>
        <form className="mt-3 flex max-w-[520px] gap-2" method="get">
          <input name="as" type="email" defaultValue={as ?? ""} placeholder="Someone in the audience, by email" className={input} aria-label="Preview as" />
          <Button type="submit" variant="secondary">Preview as them</Button>
        </form>
        {previewNote && <p className="mt-2 text-[13px] text-subtle">{previewNote}</p>}
        {preview && (
          <div className="mt-3 rounded-[12px] bg-shade p-4">
            <p className="text-[14px] font-medium text-fg">{preview.subject || "(no subject)"}</p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-[14px] leading-[1.55] text-fg">{preview.text || "(nothing yet)"}</pre>
            <p className="mt-3 text-[12.5px] text-subtle">Then the footer: who we are, how to reach us, and the unsubscribe link.</p>
          </div>
        )}
        {!locked && (
          <form action={sendCampaignTest.bind(null, id)} className="mt-3"><Button type="submit" variant="secondary">Send a test to me</Button></form>
        )}
      </section>

      {!locked && (
        <section className="rounded-[16px] border border-border bg-surface p-4 sm:p-5" data-send>
          <h3 className="font-display text-[20px] leading-none text-ink">Send it</h3>
          <div className="mt-3 flex flex-col gap-4">
            <form action={scheduleCampaign.bind(null, id)} className="flex flex-wrap items-end gap-2">
              <label><span className={label}>At (Melbourne time)</span><input type="datetime-local" name="at" required className={input} /></label>
              <Button type="submit" variant="secondary">Schedule</Button>
            </form>
            <form action={sendCampaignNow.bind(null, id)} className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="confirm" required /> I&rsquo;ve checked the test{count ? `, and it goes to ${count.sendable} people` : ""}</label>
              <Button type="submit">Send now</Button>
            </form>
            {c.status === "scheduled" && (
              <form action={cancelCampaign.bind(null, id)}><Button type="submit" variant="secondary">Unschedule</Button></form>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
