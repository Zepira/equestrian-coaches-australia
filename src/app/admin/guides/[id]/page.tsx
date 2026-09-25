import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { createServiceSupabase } from "@/lib/supabase/service";
import { getProfessions } from "@/lib/cms/read";
import { changeLog } from "@/lib/admin";
import { fileUrl, type Guide } from "@/lib/guides";
import { HistoryList } from "../../history-list";
import { TermImagePanel } from "../../term-image-panel";
import { DownloadPanel } from "../download-panel";
import { deleteGuide, removeGuideHero, saveGuide, setGuidePublished, uploadGuideHero } from "../actions";

export const metadata = { title: "Guide" };

/**
 * One guide (M9): the words in Markdown with a preview under the form, the
 * photo and the download, tags, the co-author, SEO, and publish.
 */
export default async function AdminGuidePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  const { id } = await params;
  const { done, error } = await searchParams;
  const service = createServiceSupabase();
  if (!service) return null;
  const { data } = await service.from("guides").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const g = data as Guide;
  const [professions, { data: terms }, { data: tagged }, { data: providers }, { data: area }, history] = await Promise.all([
    getProfessions(),
    g.profession_id ? service.from("terms").select("id, name").eq("parent_id", g.profession_id).eq("kind", "discipline").eq("active", true).order("name") : Promise.resolve({ data: [] }),
    service.from("guide_terms").select("term_id").eq("guide_id", id),
    service.from("providers").select("id, name").eq("status", "published").order("name").limit(500),
    g.area_id ? service.from("areas").select("name, state").eq("id", g.area_id).maybeSingle() : Promise.resolve({ data: null }),
    changeLog(service, { table: "guides", rowIds: [id] }),
  ]);
  const taggedIds = new Set((tagged ?? []).map((t) => t.term_id as string));
  const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";
  const label = "mb-1 block text-[13px] font-medium text-fg";
  const live = g.status === "published";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[14px]"><Link href="/admin/guides" className="text-accent">← Guides</Link></p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[26px] leading-none text-ink">{g.title}</h2>
          <p className="mt-1.5 text-[14px] text-muted">
            {live ? <>Live at <Link href={`/guides/${g.slug}`} className="text-accent">/guides/{g.slug}</Link></> : <>Draft. <Link href={`/guides/${g.slug}?preview=1`} className="text-accent">Preview the page</Link></>}
          </p>
        </div>
        <form action={setGuidePublished.bind(null, id, !live)}>
          <Button type="submit" variant={live ? "secondary" : "primary"}>{live ? "Take it down" : "Publish"}</Button>
        </form>
      </div>
      {done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{done}</p>}
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}

      <div className="grid gap-6 wide:grid-cols-[1fr_320px]">
        <form action={saveGuide.bind(null, id)} className="flex flex-col gap-4" data-guide-form>
          <label><span className={label}>Title</span><input name="title" defaultValue={g.title} required maxLength={120} className={input} /></label>
          <label><span className={label}>Address</span>
            <input name="slug" defaultValue={g.slug} disabled={live} className={input} />
            {live && <span className="mt-1 block text-[12.5px] text-subtle">Fixed while it&rsquo;s live, because links and search results point at it.</span>}
          </label>
          <label><span className={label}>Summary (under the title, and in lists)</span><textarea name="summary" defaultValue={g.summary} rows={2} maxLength={400} className={input} /></label>
          <label>
            <span className={label}>The guide</span>
            <textarea name="body" defaultValue={g.body} rows={18} className={`${input} font-mono text-[13px]`} />
            <span className="mt-1 block text-[12.5px] text-subtle">## for a heading, ### for a smaller one, - for a list, &gt; for a quote, **bold**, *italic*, [words](https://… or /coaches) for a link. A blank line starts a new paragraph.</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Written by</span><input name="author_name" defaultValue={g.author_name} maxLength={80} className={input} /></label>
            <label><span className={label}>With (a listed professional)</span>
              <select name="coauthor_provider_id" defaultValue={g.coauthor_provider_id ?? ""} className={input}>
                <option value="">Nobody</option>
                {(providers ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label><span className={label}>Profession</span>
              <select name="profession_id" defaultValue={g.profession_id ?? ""} className={input}>
                <option value="">Any</option>
                {professions.filter((p) => p.id).map((p) => <option key={p.id} value={p.id!}>{p.name}</option>)}
              </select>
            </label>
            <label><span className={label}>Place (for the professionals nearby)</span><input name="area" defaultValue={area ? `${area.name}` : ""} placeholder="Bendigo" className={input} /></label>
          </div>
          {(terms ?? []).length > 0 && (
            <fieldset>
              <legend className={label}>About</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[14px]">
                {(terms ?? []).map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5"><input type="checkbox" name="term_id" value={t.id} defaultChecked={taggedIds.has(t.id)} />{t.name}</label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Photo description (for screen readers)</span><input name="hero_alt" defaultValue={g.hero_alt} className={input} /></label>
            <label><span className={label}>Photo credit</span><input name="hero_credit" defaultValue={g.hero_credit} className={input} /></label>
            <label><span className={label}>What the download is</span><input name="download_title" defaultValue={g.download_title} placeholder="horse care calendar" className={input} /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Search title (up to 70)</span><input name="seo_title" defaultValue={g.seo_title} maxLength={70} placeholder={g.title} className={input} /></label>
            <label><span className={label}>Search description (up to 170)</span><input name="seo_description" defaultValue={g.seo_description} maxLength={170} placeholder={g.summary} className={input} /></label>
          </div>
          <div><Button type="submit">Save</Button></div>
        </form>

        <div className="flex flex-col gap-4">
          <TermImagePanel
            src={g.hero_path ? fileUrl(service, g.hero_path) : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"}
            uploaded={Boolean(g.hero_path)}
            placeholderLabel="No photo yet"
            note="The photo at the top of the guide and in lists. It's resized to 1600px before it uploads."
            upload={uploadGuideHero.bind(null, id)}
            remove={removeGuideHero.bind(null, id)}
          />
          <DownloadPanel guideId={id} current={g.download_path} currentUrl={g.download_path ? fileUrl(service, g.download_path) : null} />
          <form action={deleteGuide.bind(null, id)}>
            <button className="text-[13px] text-subtle hover:text-danger">Delete this guide</button>
          </form>
        </div>
      </div>

      <section className="rounded-[16px] border border-border bg-surface p-5" data-guide-preview>
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-subtle">Preview of the saved words</p>
        <Markdown source={g.body || "Nothing written yet."} />
      </section>
      <HistoryList rows={history} />
    </div>
  );
}
