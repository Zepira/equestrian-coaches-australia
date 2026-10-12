"use client";

import { createClient } from "@/lib/supabase/client";
import type { SignedUpload } from "@/lib/storage-upload";

/**
 * The browser half of src/lib/storage-upload.ts: ask the server where to put
 * the file, put it there, tell the server it's done.
 */
export async function uploadDirect(
  file: File,
  start: (fileName: string) => Promise<SignedUpload>,
  finish: (path: string) => Promise<void>,
): Promise<void> {
  const target = await start(file.name);
  const supabase = createClient();
  if (!supabase) throw new Error("Storage isn't connected.");
  const { error } = await supabase.storage.from(target.bucket).uploadToSignedUrl(target.path, target.token, file, {
    contentType: file.type || "application/octet-stream",
    cacheControl: "31536000", // every path carries a timestamp, so a file never changes in place
  });
  if (error) throw new Error("The upload didn't go through. Check your connection and try again.");
  await finish(target.path);
}
