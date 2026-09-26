import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { whoNames } from "@/lib/admin";
import { PURPOSES, PURPOSE_LABELS, type Purpose } from "@/lib/audience";
import { addWording, deleteContact, sendLaunchEmail, stopContact, unblockContact } from "./actions";

export const metadata = { title: "Audience" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
const TYPE: Record<string, string> = { express: "ticked a box", existing_customer: "existing customer", published_address: "published business address" };

/**
 * /admin/audience (The Marketing Engine M1): how many people we can email
 * for each purpose, one person's full record (consents with the exact words,
 * where they came from, blocks), stopping or deleting on request, and the
 * words of every consent box, by version.
 */
export default async function AdminAudiencePage({ searchParams }: { searchParams: Promise<{ q?: string; done?: string; error?: string }> }) {
  const { q = "", done, error } = await searchParams;
  const supabase = await createClient();
  const service = createServiceSupabase();
  if (!supabase || !service) return null;

  const [{ count: contacts }, { data: statuses }, { data: blocks }, { data: wordings }, { count: launchSent }] = await Promise.all([
    service.from("contacts").select("id", { count: "exact", head: true }),
    service.from("consent_status").select("purpose, action"),
    service.from("suppressions").select("reason"),
    supabase.from("consent_wordings").select("id, purpose, version, body, created_at, created_by").order("purpose").order("version", { ascending: false }),
    service.from("email_sends").select("contact_id", { count: "exact", head: true }).eq("key", "launch"),
  ]);
  const granted = (p: Purpose) => (statuses ?? []).filter((s) => s.purpose === p && s.action === "grant").length;
  const blockCount = (r: string) => (blocks ?? []).filter((b) => b.reason === r).length;
  const wordingNames = await whoNames(supabase, (wordings ?? []).map((w) => w.created_by));

  const email = q.trim().toLowerCase();
  const { data: contact } = email ? await service.from("contacts").select("id, email, token, profile_id, first_touch, last_touch, created_at, profiles(name, role)").eq("email", email).maybeSingle() : { data: null };
  const [{ data: history }, { data: personBlocks }] = contact
    ? await Promise.all([
        service.from("consents").select("purpose, action, type, source, method, ip, created_at, created_by, consent_wordings(version, body)").eq("contact_id", contact.id).order("created_at", { ascending: false }),
        service.from("suppressions").select("reason, detail, created_at").eq("email", contact.email),
      ])
    : [{ data: null }, { data: null }];
  const actors = await whoNames(supabase, (history ?? []).map((h) => h.created_by as string | null));
  const profile = (contact as unknown as { profiles: { name: string; role: string } | null } | null)?.profiles;
  const touch = (t: unknown) => {
    const x = t as { source?: string; medium?: string; campaign?: string; at?: string } | null;
    return x?.source ? `${x.source}${x.medium ? ` / ${x.medium}` : ""}${x.campaign ? ` / ${x.campaign}` : ""}${x.at ? `, ${when(x.at)}` : ""}` : "none recorded";
  };
  const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Audience</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          Everyone we hold an email address for, and what each has agreed to. Consent is only ever added to, never edited, so the record shows what was agreed, when, where and in what words.
        </p>
      </div>
      {done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{done}</p>}
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}

      <div className="grid gap-3 @[760px]/admin:grid-cols-3" data-audience-counts>
        <div className="rounded-[14px] border border-border bg-surface p-4">
          <div className="font-display text-[32px] leading-none text-ink">{contacts ?? 0}</div>
          <div className="mt-1 text-[13px] text-subtle">email addresses</div>
        </div>
        {(["rider_alerts", "rider_news", "provider_news"] as Purpose[]).map((p) => (
          <div key={p} className="rounded-[14px] border border-border bg-surface p-4">
            <div className="font-display text-[32px] leading-none text-ink">{granted(p)}</div>
            <div className="mt-1 text-[13px] text-subtle">{PURPOSE_LABELS[p].toLowerCase()}</div>
          </div>
        ))}
        <div className="rounded-[14px] border border-border bg-surface p-4 text-[13px] text-muted @[760px]/admin:col-span-2">
          Not emailed: {blockCount("unsubscribe_all")} stopped everything, {blockCount("bounce")} bounced, {blockCount("complaint")} marked us as spam, {blockCount("admin")} blocked by you.
        </div>
      </div>

      <section className="rounded-[16px] border border-border bg-surface p-4 @[560px]/admin:p-5" data-launch>
        <h3 className="font-display text-[20px] leading-none text-ink">The launch email</h3>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          {granted("waitlist")} {granted("waitlist") === 1 ? "person has" : "people have"} asked to hear when the site opens; {launchSent ?? 0} {launchSent === 1 ? "has" : "have"} been sent it. Each address gets it once, so pressing again only reaches people who asked since. The words are under Emails.
        </p>
        <form action={sendLaunchEmail} className="mt-3">
          <Button type="submit" disabled={granted("waitlist") <= (launchSent ?? 0)}>Send the launch email</Button>
        </form>
      </section>

      <section>
        <form className="flex gap-2" role="search">
          <input name="q" type="email" defaultValue={q} placeholder="Find someone by email" aria-label="Email" className={input} />
          <button className="rounded-[var(--radius-pill)] bg-ink px-4 text-[14px] text-ink-fg">Find</button>
        </form>
        {email && !contact && <p className="mt-3 text-[14px] text-subtle">Nobody with that address.</p>}
        {contact && (
          <div className="mt-4 flex flex-col gap-4 rounded-[16px] border border-border bg-surface p-4 @[560px]/admin:p-5" data-contact>
            <div>
              <div className="font-display text-[22px] leading-none text-ink">{contact.email}</div>
              <p className="mt-1.5 text-[13px] text-subtle">
                {profile ? `${profile.role === "provider" ? "Professional" : "Rider"} account${profile.name ? `, ${profile.name}` : ""}` : "No account"} · on the list since {when(contact.created_at)}
              </p>
              <p className="mt-1 text-[13px] text-subtle">First came from: {touch(contact.first_touch)}. Most recently: {touch(contact.last_touch)}.</p>
            </div>
            {(personBlocks ?? []).length > 0 && (
              <p className="text-[13px] text-danger">
                Not emailed: {(personBlocks ?? []).map((b) => `${b.reason.replace("_", " ")}${b.detail ? ` (${b.detail})` : ""}, ${when(b.created_at)}`).join("; ")}
              </p>
            )}
            <div>
              <h3 className="text-[15px] font-semibold text-fg">Consent record</h3>
              {(history ?? []).length === 0 ? (
                <p className="mt-1 text-[13px] text-subtle">Nothing agreed to yet.</p>
              ) : (
                <ul className="mt-2 flex flex-col text-[13px]" data-consents>
                  {(history ?? []).map((h, i) => {
                    const w = (h as unknown as { consent_wordings: { version: number; body: string } | null }).consent_wordings;
                    return (
                      <li key={i} className="border-b border-border py-2">
                        <span className={h.action === "grant" ? "text-success" : "text-danger"}>{h.action === "grant" ? "Agreed to" : "Stopped"}</span>{" "}
                        <span className="text-fg">{PURPOSE_LABELS[h.purpose as Purpose]?.toLowerCase() ?? h.purpose}</span>
                        <span className="text-subtle">
                          {" "}
                          · {h.action === "grant" ? TYPE[h.type as string] ?? h.type : h.method} · {h.source} · {when(h.created_at)}
                          {h.ip ? ` · ${h.ip}` : ""}
                          {h.created_by ? ` · by ${actors.get(h.created_by as string) ?? "an admin"}` : ""}
                        </span>
                        {w && <div className="mt-0.5 text-subtle">Words, version {w.version}: &ldquo;{w.body}&rdquo;</div>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
              <form action={stopContact.bind(null, contact.id)} className="flex flex-wrap items-end gap-2">
                <label className="block">
                  <span className="mb-1 block text-[13px] text-subtle">Why (kept in the record)</span>
                  <input name="why" placeholder="asked by phone" className={input} />
                </label>
                <Button type="submit" variant="secondary">Stop all marketing</Button>
              </form>
              {(personBlocks ?? []).some((b) => b.reason === "admin") && (
                <form action={unblockContact.bind(null, contact.email)}>
                  <button className="text-[13px] text-accent">Lift your block</button>
                </form>
              )}
              {!contact.profile_id && (
                <form action={deleteContact.bind(null, contact.id)}>
                  <button className="text-[13px] text-danger underline-offset-2 hover:underline">Delete on request</button>
                </form>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[22px] leading-none text-ink">The words beside each box</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          What people agree to. Changing the words makes a new version; everyone who agreed before keeps the version they saw.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {PURPOSES.filter((p) => p !== "waitlist").map((p) => {
            const versions = (wordings ?? []).filter((w) => w.purpose === p);
            return (
              <form key={p} action={addWording} className="flex flex-col gap-2 rounded-[14px] border border-border bg-surface p-4" data-wording={p}>
                <input type="hidden" name="purpose" value={p} />
                <span className="text-[14px] font-medium text-fg">{PURPOSE_LABELS[p]}</span>
                <textarea name="body" defaultValue={versions[0]?.body ?? ""} rows={2} className={input} />
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" variant="secondary">Save as a new version</Button>
                  <span className="text-[12px] text-subtle">
                    {versions.length ? `Version ${versions[0].version}, ${when(versions[0].created_at)}${versions[0].created_by ? ` by ${wordingNames.get(versions[0].created_by) ?? "an admin"}` : ""}` : "No words yet"}
                    {versions.length > 1 ? ` · ${versions.length - 1} earlier` : ""}
                  </span>
                </div>
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}
