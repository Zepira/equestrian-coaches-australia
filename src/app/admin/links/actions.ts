"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formText, requireAdmin } from "@/lib/admin";

/**
 * Tracked links (The Marketing Engine M2): one per channel, made in a line.
 * change_log records each one by trigger.
 */
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

export async function createLink(fd: FormData) {
  const { supabase, userId } = await requireAdmin();
  const back = (m: string) => redirect(`/admin/links?error=${encodeURIComponent(m)}`);
  const label = formText(fd, "label", 80);
  const slug = slugify(formText(fd, "slug", 60) || label);
  const destination = formText(fd, "destination", 200) || "/";
  const source = slugify(formText(fd, "utm_source", 60) || slug);
  if (!label) back("Give the link a name you'll recognise, like \"Kim's Facebook post, Western group\".");
  if (!slug) back("That name doesn't make a usable address.");
  if (!destination.startsWith("/")) back("The destination is a page on this site, starting with /.");
  const { error } = await supabase.from("links").insert({
    slug,
    label,
    destination,
    utm_source: source,
    utm_medium: slugify(formText(fd, "utm_medium", 40)) || "link",
    utm_campaign: slugify(formText(fd, "utm_campaign", 60)),
    created_by: userId,
  });
  if (error) back(error.code === "23505" ? `/go/${slug} already exists. Pick another address.` : error.message);
  revalidatePath("/admin/links");
  redirect(`/admin/links?made=${slug}`);
}

export async function setLinkArchived(id: string, archived: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("links").update({ archived }).eq("id", id);
  revalidatePath("/admin/links");
}
