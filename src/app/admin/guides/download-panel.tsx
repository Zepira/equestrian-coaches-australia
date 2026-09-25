"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { guideDownloadUploadUrl, removeGuideDownload, setGuideDownload } from "./actions";

// The guide-files bucket (GUIDE_FILES in src/lib/guides.ts, which is server-side).
const GUIDE_FILES = "guide-files";

/** The guide's PDF (the download people ask for by email): up to 20MB, straight to storage. */
export function DownloadPanel({ guideId, current, currentUrl }: { guideId: string; current: string | null; currentUrl: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.type !== "application/pdf") return setError("It has to be a PDF.");
    if (file.size > 20 * 1024 * 1024) return setError("Keep it under 20MB.");
    start(async () => {
      try {
        const { path, token } = await guideDownloadUploadUrl(guideId, file.name);
        const supabase = createClient();
        if (!supabase) throw new Error("Storage isn't connected.");
        const { error: up } = await supabase.storage.from(GUIDE_FILES).uploadToSignedUrl(path, token, file, { contentType: "application/pdf" });
        if (up) throw up;
        await setGuideDownload(guideId, path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed. Try again.");
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-4" data-download-panel>
      <p className="text-[14px] font-medium text-fg">Download (optional)</p>
      <p className="text-[13px] text-muted">
        A PDF people can ask for by email on the guide, like a year planner. {current ? (
          <a href={currentUrl ?? "#"} className="text-accent">The current file</a>
        ) : "None yet."}
      </p>
      <input ref={input} type="file" accept="application/pdf" className="hidden" disabled={pending} onChange={onPick} />
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" disabled={pending} onClick={() => input.current?.click()}>{pending ? "Uploading…" : current ? "Replace the PDF" : "Upload a PDF"}</Button>
        {current && (
          <button type="button" disabled={pending} onClick={() => start(async () => { await removeGuideDownload(guideId); })} className="text-[13px] text-subtle hover:text-danger">
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
