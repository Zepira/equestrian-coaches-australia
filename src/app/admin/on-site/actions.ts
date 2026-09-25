"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formText, requireAdmin } from "@/lib/admin";
import { reservedSlugError } from "@/lib/reserved-slugs";

/**
 * Landing pages (The Marketing Engine M3), one per partner or event, at
 * /p/[slug]. change_log records every save by trigger.
 */
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

export async function createLanding(fd: FormData) {
  const { supabase } = await requireAdmin();
  const name = formText(fd, "name", 80);
  const slug = slugify(formText(fd, "slug", 60) || name);
  if (!name || !slug) redirect(`/admin/on-site?error=${encodeURIComponent("Give the page a name.")}`);
  const reserved = reservedSlugError("discipline", slug);
  if (reserved) redirect(`/admin/on-site?error=${encodeURIComponent(reserved)}`);
  const { data, error } = await supabase.from("landing_pages").insert({ slug, name, title: name }).select("id").single();
  if (error) redirect(`/admin/on-site?error=${encodeURIComponent(error.code === "23505" ? `/p/${slug} already exists.` : error.message)}`);
  revalidatePath("/admin/on-site");
  redirect(`/admin/on-site?page=${data!.id}#landing`);
}

export async function saveLanding(id: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const title = formText(fd, "title", 140);
  const buttonHref = formText(fd, "button_href", 200);
  if (!title) redirect(`/admin/on-site?page=${id}&error=${encodeURIComponent("The page needs a headline.")}#landing`);
  if (buttonHref && !/^(\/|https:\/\/)/.test(buttonHref)) redirect(`/admin/on-site?page=${id}&error=${encodeURIComponent("The button's link starts with / or https://.")}#landing`);
  const { data: row } = await supabase.from("landing_pages").select("slug").eq("id", id).single();
  const { error } = await supabase
    .from("landing_pages")
    .update({
      name: formText(fd, "name", 80) || title,
      eyebrow: formText(fd, "eyebrow", 80),
      title,
      body: formText(fd, "body", 5000),
      button_label: formText(fd, "button_label", 40),
      button_href: buttonHref,
      show_alerts: fd.get("show_alerts") === "on",
      published: fd.get("published") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) redirect(`/admin/on-site?page=${id}&error=${encodeURIComponent(error.message)}#landing`);
  if (row) revalidatePath(`/p/${row.slug}`);
  revalidatePath("/admin/on-site");
  redirect(`/admin/on-site?page=${id}&saved=1#landing`);
}

export async function deleteLanding(id: string) {
  const { supabase } = await requireAdmin();
  const { data: row } = await supabase.from("landing_pages").select("slug").eq("id", id).single();
  await supabase.from("landing_pages").delete().eq("id", id);
  if (row) revalidatePath(`/p/${row.slug}`);
  revalidatePath("/admin/on-site");
  redirect("/admin/on-site#landing");
}
