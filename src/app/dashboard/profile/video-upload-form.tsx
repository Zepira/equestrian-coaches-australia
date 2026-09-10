"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { uploadVideo } from "./actions";

// No client-side compression for video (unlike photos) — re-encoding video
// in-browser is a much bigger job than a canvas resize and out of scope
// here. Instead just cap the source file size — Supabase's free storage
// tier is a 1GB total cap shared across every coach (CLAUDE.md), so a
// generous per-coach video allowance would eat it fast. 40MB is enough for
// a short (~30-60s) intro clip at reasonable quality, not enough to hurt
// the shared cap badly even if most coaches use one.
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

// Same one-button pattern as PhotoUploadForm: hidden file input, a visible
// button opens the picker, selecting a file uploads immediately.
export function VideoUploadForm({ configured }: { configured: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_VIDEO_BYTES) {
      setError(`That file's too large — please choose a video under ${MAX_VIDEO_BYTES / (1024 * 1024)}MB.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const formData = new FormData();
    formData.set("video", file);

    setStatus("uploading");
    startTransition(async () => {
      try {
        await uploadVideo(formData);
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
    <div className="flex flex-col gap-1.5">
      <div>
        <input
          ref={inputRef}
          id="video-file-input"
          name="video"
          type="file"
          accept="video/*"
          disabled={!configured || busy}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!configured || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : "Add an intro video"}
        </Button>
      </div>
      <p className="max-w-xs text-xs text-muted">
        A short clip of you coaching — up to {MAX_VIDEO_BYTES / (1024 * 1024)}MB.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
