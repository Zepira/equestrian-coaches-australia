import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { changeLog } from "@/lib/admin";
import { CONTENT_DEFAULTS } from "@/lib/cms/content-defaults";
import { sameShape } from "@/lib/cms/read";
import { FIELD_HINTS } from "@/lib/cms/registry";
import { DEFAULTS, SETTING_RANGES } from "@/lib/settings";
import { ContentEditor, type EditorBlock } from "../content-editor";
import { HistoryList } from "../history-list";
import { savePage } from "../pages/actions";
import { saveSetting } from "../settings/actions";
import { createLanding, deleteLanding, saveLanding } from "./actions";

export const metadata = { title: "On the site" };

type Landing = { id: string; slug: string; name: string; eyebrow: string; title: string; body: string; button_label: string; button_href: string; show_alerts: boolean; published: boolean; updated_at: string };

/**
 * /admin/on-site (The Marketing Engine M3): the announcement bar, the
 * slide-in and its switch, and landing pages for partners and events.
 */
export default async function AdminOnSitePage({ searchParams }: { searchParams: Promise<{ page?: string; saved?: string; error?: string }> }) {
  const { page: pageId, saved, error } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const keys = ["site.announcement", "site.slide_in"] as const;
  const [{ data: rows }, { data: settingRows }, { data: landings }, history] = await Promise.all([
    supabase.from("content_blocks").select("key, value").in("key", [...keys]),
    supabase.from("settings").select("key, value").in("key", ["slide_in_enabled", "slide_in_delay_seconds", "slide_in_every_days"]),
    supabase.from("landing_pages").select("*").order("updated_at", { ascending: false }),
    changeLog(supabase, { table: "landing_pages" }),
  ]);
  const block = (key: (typeof keys)[number], name: string): EditorBlock => {
    const def = CONTENT_DEFAULTS[key];
    const v = rows?.find((r) => r.key === key)?.value;
    return { key, name, def: def as EditorBlock["def"], value: (v !== undefined && sameShape(v, def) ? v : def) as EditorBlock["value"] };
  };
  const setting = (k: "slide_in_enabled" | "slide_in_delay_seconds" | "slide_in_every_days") => settingRows?.find((r) => r.key === k)?.value ?? DEFAULTS[k];
  const editing = ((landings ?? []) as Landing[]).find((l) => l.id === pageId);
  const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">On the site</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">Quiet ways to ask visitors to stay in touch. Everything here is off or empty until you fill it in.</p>
      </div>
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}

      <section data-announcement-editor>
        <h3 className="font-display text-[22px] leading-none text-ink">Announcement bar</h3>
        <p className="mt-1.5 mb-3 text-[13px] text-subtle">One line along the bottom of every page, between its dates. A visitor who closes it doesn&rsquo;t see it again. A deadline goes here with its real date, never a countdown.</p>
        <ContentEditor blocks={[block("site.announcement", "Announcement bar")]} hints={FIELD_HINTS} action={savePage.bind(null, "announcement")} />
      </section>

      <section data-slide-in-editor>
        <h3 className="font-display text-[22px] leading-none text-ink">Slide-in</h3>
        <p className="mt-1.5 mb-3 text-[13px] text-subtle">
          Offers alerts to visitors who aren&rsquo;t signed in or already subscribed, after a delay, never on a profile or private page, at most once every few days.
        </p>
        <form action={saveSetting} className="mb-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="key" value="slide_in_enabled" />
          <input type="hidden" name="back" value="/admin/on-site" />
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Slide-in</span>
            <select name="value" defaultValue={setting("slide_in_enabled")} className={input}>
              <option value="false">Off</option>
              <option value="true">On</option>
            </select>
          </label>
          <Button type="submit" variant="secondary">Save</Button>
        </form>
        <div className="mb-4 flex flex-wrap gap-4">
          {(
            [
              ["slide_in_delay_seconds", "Seconds before it shows"],
              ["slide_in_every_days", "Days before the same person sees it again"],
            ] as const
          ).map(([k, l]) => (
            <form key={k} action={saveSetting} className="flex items-end gap-2">
              <input type="hidden" name="key" value={k} />
              <input type="hidden" name="back" value="/admin/on-site" />
              <label className="block">
                <span className="mb-1 block text-[14px] font-medium text-fg">{l}</span>
                <input type="number" name="value" min={SETTING_RANGES[k][0]} max={SETTING_RANGES[k][1]} defaultValue={setting(k)} className={`${input} w-28`} />
              </label>
              <Button type="submit" variant="secondary">Save</Button>
            </form>
          ))}
        </div>
        <ContentEditor blocks={[block("site.slide_in", "Slide-in")]} hints={FIELD_HINTS} action={savePage.bind(null, "slide-in")} />
      </section>

      <section id="landing" className="scroll-mt-24">
        <h3 className="font-display text-[22px] leading-none text-ink">Landing pages</h3>
        <p className="mt-1.5 text-[13px] text-subtle">A page for one partner or event at /p/…, kept out of search results. Give it a tracked link on Links and sources.</p>
        <ul className="mt-3 flex flex-col gap-2 text-[14px]">
          {((landings ?? []) as Landing[]).map((l) => (
            <li key={l.id} className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-2.5">
              <span className="flex-1">
                <span className="font-medium text-fg">{l.name}</span> <span className="text-subtle">/p/{l.slug} · {l.published ? "live" : "not live"}</span>
              </span>
              {l.published && <Link href={`/p/${l.slug}`} target="_blank" className="text-subtle hover:text-fg">View</Link>}
              <Link href={`/admin/on-site?page=${l.id}#landing`} className="font-medium text-accent">Edit</Link>
            </li>
          ))}
        </ul>
        <form action={createLanding} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">New page</span>
            <input name="name" required placeholder="Pony Club members" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Address after /p/</span>
            <input name="slug" placeholder="pony-club" className={input} />
          </label>
          <Button type="submit">Add</Button>
        </form>

        {editing && (
          <form action={saveLanding.bind(null, editing.id)} className="mt-5 flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 @[560px]/admin:p-5" data-landing-editor>
            {saved && <p role="status" className="text-[14px] text-success">Saved.</p>}
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="font-display text-[20px] leading-none text-ink">/p/{editing.slug}</h4>
            </div>
            <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">Name (for you)</span><input name="name" defaultValue={editing.name} className={input} /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">Small line above the headline</span><input name="eyebrow" defaultValue={editing.eyebrow} className={input} /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">Headline <span className="font-normal text-subtle">*words* in italic</span></span><input name="title" defaultValue={editing.title} className={input} /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">Words <span className="font-normal text-subtle">a blank line starts a paragraph; **bold**</span></span><textarea name="body" defaultValue={editing.body} rows={8} className={input} /></label>
            <div className="grid gap-3 @[560px]/admin:grid-cols-2">
              <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">Button</span><input name="button_label" defaultValue={editing.button_label} placeholder="List your business" className={input} /></label>
              <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">Button goes to</span><input name="button_href" defaultValue={editing.button_href} placeholder="/join/coaches?ref=pony-club" className={input} /></label>
            </div>
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="show_alerts" defaultChecked={editing.show_alerts} /> Show the alert card</label>
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="published" defaultChecked={editing.published} /> Live</label>
            <div className="flex items-center gap-4">
              <Button type="submit">Save</Button>
              <button formAction={deleteLanding.bind(null, editing.id)} className="text-[13px] text-danger">Delete</button>
            </div>
          </form>
        )}
      </section>

      <HistoryList rows={history} />
    </div>
  );
}
