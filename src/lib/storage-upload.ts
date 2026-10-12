import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Files go from the browser straight to Supabase Storage, never through our
 * server: a server action body is capped at 1MB by Next.js and every request
 * at 4.5MB by Vercel, so a phone photo or a PDF posted through an action
 * fails in production while working locally.
 *
 * The shape, for every upload: a "start" action checks who's asking and
 * returns a one-time signed upload address for a path it chose; the browser
 * uploads to it (src/lib/upload-direct.ts); a "finish" action checks the
 * path is one this record owns and the object exists, then saves it. The
 * browser never picks the path, so it can't write over someone else's file.
 */
export type SignedUpload = { bucket: string; path: string; token: string };

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif", "heic", "heif"]);

/** A safe extension for an image from its file name, "jpg" when it isn't one we know. */
export function imageExt(fileName: string): string {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  return IMAGE_EXTS.has(ext) ? ext : "jpg";
}

export async function signUpload(service: SupabaseClient, bucket: string, path: string): Promise<SignedUpload> {
  const { data, error } = await service.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("Couldn't start the upload.");
  return { bucket, path: data.path, token: data.token };
}

/** Throws unless `path` sits under `prefix` and the object is really there. */
export async function assertUploaded(service: SupabaseClient, bucket: string, path: string, prefix: string): Promise<void> {
  if (!path.startsWith(prefix) || path.includes("..")) throw new Error("That file isn't this one's.");
  const slash = path.lastIndexOf("/");
  const { data, error } = await service.storage.from(bucket).list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });
  if (error || !data?.some((o) => o.name === path.slice(slash + 1))) throw new Error("The upload didn't arrive. Try again.");
}
