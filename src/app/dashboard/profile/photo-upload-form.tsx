"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { uploadPhoto } from "./actions";
import { compressImage, MAX_SOURCE_BYTES } from "@/lib/compress-image";

// Resize/re-encode lives in src/lib/compress-image.ts (shared with the
// admin's discipline image field).

// One button, not two steps. Previously this was "Choose file" (opens the
// native picker) then a separate "Upload" button you had to remember to
// click afterwards — confusing, and easy to pick a file and walk away
// thinking it was done. Now the file input is visually hidden; the visible
// button just calls its .click() to open the picker, and selecting a file
// (onChange) uploads immediately, no second click.
export function PhotoUploadForm({ configured }: { configured: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_SOURCE_BYTES) {
      setError("That file's too large — please choose a photo under 25MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setStatus("processing");
    const processed = await compressImage(file);

    const formData = new FormData();
    formData.set("photo", processed);

    setStatus("uploading");
    startTransition(async () => {
      try {
        await uploadPhoto(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed — please try again.");
      } finally {
        setStatus("idle");
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  const busy = status !== "idle" || isPending;
  const label = status === "processing" ? "Preparing…" : status === "uploading" || isPending ? "Uploading…" : "Add a photo";

  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-6">
      <div>
        <input
          ref={inputRef}
          id="photo-file-input"
          name="photo"
          type="file"
          accept="image/*"
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
          {label}
        </Button>
      </div>
      <p className="max-w-xs text-xs text-muted">
        Works from your camera or photo library on your phone, or a file on desktop — resized
        automatically before upload.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
