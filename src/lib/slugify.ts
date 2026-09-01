/** Turns free text into a URL-safe slug: lowercase, hyphen-separated, no leading/trailing hyphens. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
