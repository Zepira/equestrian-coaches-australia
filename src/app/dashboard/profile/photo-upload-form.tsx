"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { uploadPhoto } from "./actions";

const MAX_DIMENSION = 1200; // px — plenty for a profile photo; keeps a typical
// phone photo down to a few hundred KB as JPEG, matching the "compress on
// upload" plan in CLAUDE.md so the storage free tier stretches further.
const JPEG_QUALITY = 0.85;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024; // guard against something like a RAW file

// Resizes/re-encodes to JPEG client-side before upload, on every device —
// mobile is the important case: a phone photo straight off the camera is
// often 4000px+ and several MB, slow to upload on cellular and wasteful of
// Supabase's storage cap. Falls back to the original file untouched if the
// browser can't decode it (chiefly a HEIC/HEIF file shared in from Files or
// Messages on iOS with no browser-side decoder — better an uncompressed
// upload than a blocked one; iOS's own photo-library picker typically hands
// Safari a JPEG copy already, so this mainly matters for that edge case).
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 500_000) {
      bitmap.close();
      return file; // already small enough, don't bother re-encoding
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file; // couldn't decode (e.g. HEIC with no in-browser decoder)
  }
}

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
