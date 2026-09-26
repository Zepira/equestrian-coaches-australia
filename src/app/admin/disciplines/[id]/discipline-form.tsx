"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { compressImage, MAX_SOURCE_BYTES } from "@/lib/compress-image";
import { disciplineImage, disciplineSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, type DisciplineContent } from "@/lib/discipline-content";
import { removeDisciplineImage, saveDiscipline, uploadDisciplineImage, type SaveState } from "../actions";

const field = "w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-[15px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent";
const labelCls = "mb-1 block text-sm font-medium text-fg";
const help = "mt-1 text-[12.5px] leading-[1.45] text-subtle";

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={`ml-2 text-[12px] tabular-nums ${value > max ? "text-danger" : "text-subtle"}`}>
      {value}/{max}
    </span>
  );
}

/**
 * The discipline editor. One form for the copy + SEO (saved together, with a
 * result message), and a separate image control that uploads on pick — the
 * same one-step pattern as the coach photo uploader, resizing to 1600px on
 * the way in. A live "how Google sees it" preview sits under the SEO fields
 * so the defaults are visible before anyone types an override.
 */
export function DisciplineForm({ discipline }: { discipline: DisciplineContent }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveDiscipline.bind(null, discipline.id), null);
  const [name, setName] = useState(discipline.name);
  const [blurb, setBlurb] = useState(discipline.blurb ?? "");
  const [seoTitle, setSeoTitle] = useState(discipline.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(discipline.seo_description ?? "");
  const seo = disciplineSeo({ name, blurb, seo_title: seoTitle, seo_description: seoDescription });

  return (
    <div className="grid gap-8 wide:grid-cols-[1fr_320px] wide:items-start">
      <form action={action} className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <label className="block">
            <span className={labelCls}>Name</span>
            <input name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className={field} />
          </label>
          <label className="block">
            <span className={labelCls}>
              Short description <Counter value={blurb.length} max={160} />
            </span>
            <textarea name="blurb" value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={2} maxLength={300} className={field} />
            <p className={help}>One sentence. Shown on the discipline card, under the page heading, and as the default meta description.</p>
          </label>
          <label className="block">
            <span className={labelCls}>Long description</span>
            <textarea name="description" defaultValue={discipline.description ?? ""} rows={10} className={`${field} leading-[1.55]`} />
            <p className={help}>
              Plain text. Leave a blank line between paragraphs. Shown as an &ldquo;About&rdquo; section on the page; left empty, the section is simply not rendered. This is the copy that earns the page its ranking, so write it for a rider, not for a search engine.
            </p>
          </label>
        </section>

        <section className="flex flex-col gap-4 border-t border-border pt-6">
          <h3 className="font-display text-[22px] leading-none text-ink">Photo</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Alt text</span>
              <input name="image_alt" defaultValue={discipline.image_alt ?? ""} maxLength={200} placeholder="A grey horse and rider in a dressage arena" className={field} />
              <p className={help}>What&rsquo;s in the picture, for screen readers and image search.</p>
            </label>
            <label className="block">
              <span className={labelCls}>Photo credit</span>
              <input name="image_credit" defaultValue={discipline.image_credit ?? ""} maxLength={200} placeholder="Lisa Gordon, Little More Grace Photographics" className={field} />
              <p className={help}>Shown under the photo. Required by most photographers&rsquo; terms, and by CC BY licences.</p>
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-4 border-t border-border pt-6">
          <h3 className="font-display text-[22px] leading-none text-ink">Search engines</h3>
          <label className="block">
            <span className={labelCls}>
              Page title <Counter value={(seoTitle || seo.title).length} max={SEO_TITLE_MAX} />
            </span>
            <input name="seo_title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={120} placeholder={seo.title} className={field} />
            <p className={help}>Leave blank to use the default shown as the placeholder. The site name is added after it automatically.</p>
          </label>
          <label className="block">
            <span className={labelCls}>
              Meta description <Counter value={(seoDescription || seo.description).length} max={SEO_DESCRIPTION_MAX} />
            </span>
            <textarea name="seo_description" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} maxLength={320} placeholder={seo.description} className={field} />
          </label>
          <div className="rounded-[12px] border border-border bg-bg px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Roughly how it appears in Google</p>
            <p className="mt-1.5 truncate text-[17px] text-[#1a0dab]">{seo.title} | Equine Professionals Australia</p>
            <p className="text-[13px] text-[#006621]">equineprofessionals.com.au › disciplines › {discipline.slug}</p>
            <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-[1.45] text-muted">{seo.description}</p>
          </div>
        </section>

        <div className="flex items-center gap-4 border-t border-border pt-5">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          {state && (
            <p className={`text-[14px] ${state.ok ? "text-fg" : "text-danger"}`} role="status">
              {state.message}
            </p>
          )}
        </div>
      </form>

      <ImagePanel discipline={discipline} />
    </div>
  );
}

function ImagePanel({ discipline }: { discipline: DisciplineContent }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const image = disciplineImage(discipline, 800);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_SOURCE_BYTES) {
      setError("That file's too large — please choose an image under 25MB.");
      e.target.value = "";
      return;
    }
    setStatus("processing");
    const processed = await compressImage(file, 1600);
    const fd = new FormData();
    fd.set("image", processed);
    setStatus("uploading");
    startTransition(async () => {
      try {
        await uploadDisciplineImage(discipline.id, fd);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed — please try again.");
      } finally {
        setStatus("idle");
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  const busy = status !== "idle" || isPending;

  return (
    <aside className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 wide:sticky wide:top-[100px]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-shade">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.alt} className="block h-full w-full object-cover" />
        {!image.uploaded && (
          <span className="absolute bottom-2 left-2 rounded-[var(--radius-pill)] bg-ink-deep/82 px-2.5 py-1 text-[11px] font-medium text-ink-fg">Stock placeholder</span>
        )}
      </div>
      <p className="text-[13px] leading-[1.45] text-muted">
        {image.uploaded
          ? "Your photo. Shown on the discipline page, its card, the homepage tile and as the link preview image."
          : "Using the launch stock photo until you upload one. Landscape, at least 1200px wide; resized to 1600px on upload."}
      </p>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" disabled={busy} onChange={onPick} />
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
          {status === "processing" ? "Preparing…" : busy ? "Uploading…" : image.uploaded ? "Replace photo" : "Upload photo"}
        </Button>
        {image.uploaded && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              startTransition(async () => {
                try {
                  await removeDisciplineImage(discipline.id);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Couldn't remove the photo.");
                }
              })
            }
            className="text-[13px] text-subtle underline-offset-2 hover:text-danger hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </aside>
  );
}
