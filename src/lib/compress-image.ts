// Client-side resize/re-encode before upload, shared by the coach photo
// uploader and the admin's discipline image field. Runs in the browser only.

const JPEG_QUALITY = 0.85;
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024; // guard against something like a RAW file

/**
 * Resizes to `maxDimension` on the longest edge and re-encodes as JPEG —
 * on every device, but mobile is the important case: a phone photo straight
 * off the camera is often 4000px+ and several MB. Falls back to the original
 * file untouched if the browser can't decode it (chiefly HEIC/HEIF shared in
 * from Files/Messages on iOS) — better an uncompressed upload than a blocked
 * one.
 */
export async function compressImage(file: File, maxDimension = 1200): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
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

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file; // couldn't decode (e.g. HEIC with no in-browser decoder)
  }
}
