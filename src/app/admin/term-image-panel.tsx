"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { compressImage, MAX_SOURCE_BYTES } from "@/lib/compress-image";

/**
 * A photo for a term (a profession, say): uploads on pick, resized to 1600px
 * in the browser first, with a remove link. The actions come bound to the
 * term from the page.
 */
export function TermImagePanel({
  src,
  uploaded,
  note,
  upload,
  remove,
  placeholderLabel = "Stock placeholder",
}: {
  /** The badge on the picture when nothing's been uploaded; empty for none. */
  placeholderLabel?: string;
  src: string;
  uploaded: boolean;
  note: string;
  upload: (fd: FormData) => Promise<void>;
  remove: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = preparing || pending;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_SOURCE_BYTES) {
      setError("That file's too large. Choose an image under 25MB.");
      e.target.value = "";
      return;
    }
    setPreparing(true);
    const fd = new FormData();
    fd.set("image", await compressImage(file, 1600));
    setPreparing(false);
    startTransition(async () => {
      try {
        await upload(fd);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed. Try again.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-shade">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="block h-full w-full object-cover" />
        {!uploaded && placeholderLabel && <span className="absolute bottom-2 left-2 rounded-[var(--radius-pill)] bg-ink-deep/82 px-2.5 py-1 text-[11px] font-medium text-ink-fg">{placeholderLabel}</span>}
      </div>
      <p className="text-[13px] leading-[1.45] text-muted">{note}</p>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" disabled={busy} onChange={onPick} />
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
          {preparing ? "Preparing…" : pending ? "Uploading…" : uploaded ? "Replace photo" : "Upload photo"}
        </Button>
        {uploaded && (
          <button
            type="button"
            disabled={busy}
            onClick={() => startTransition(async () => { try { await remove(); } catch (err) { setError(err instanceof Error ? err.message : "Couldn't remove it."); } })}
            className="text-[13px] text-subtle underline-offset-2 hover:text-danger hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
