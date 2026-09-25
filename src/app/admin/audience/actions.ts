"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { formText, requireAdmin } from "@/lib/admin";
import { createServiceSupabase } from "@/lib/supabase/service";
import { PURPOSES, stopEverything, suppress, type Purpose } from "@/lib/audience";
import { CMS_TAG } from "@/lib/cms/read";

/**
 * The Audience screen's actions (The Marketing Engine M1). Consent rows are
 * never edited: stopping someone adds withdraw rows and a suppression.
 */
const back = (q: string, m: string, key = "done") => redirect(`/admin/audience?q=${encodeURIComponent(q)}&${key}=${encodeURIComponent(m)}`);

/** Stop every commercial email to this person, on their request. */
export async function stopContact(contactId: string, fd: FormData) {
  const { userId } = await requireAdmin();
  const service = createServiceSupabase()!;
  const { data: c } = await service.from("contacts").select("id, email").eq("id", contactId).single();
  if (!c) return;
  await stopEverything(service, { id: c.id, email: c.email }, "admin", `admin: ${formText(fd, "why", 120) || "on request"}`, userId);
  await suppress(service, c.email, "admin", "stopped by admin");
  revalidatePath("/admin/audience");
  back(c.email, "Stopped. Nothing but account emails will reach them.");
}

/** Lift an admin block (never a bounce or a complaint: those come from the mail itself). */
export async function unblockContact(email: string) {
  await requireAdmin();
  const service = createServiceSupabase()!;
  await service.from("suppressions").delete().eq("email", email).in("reason", ["admin"]);
  revalidatePath("/admin/audience");
  back(email, "Block lifted. They'll only hear from us for what they've agreed to.");
}

/**
 * Delete a contact on request (privacy). Only one without an account: an
 * account goes through Riders or the professional's own deletion. The
 * address stays on the do-not-email list.
 */
export async function deleteContact(contactId: string) {
  await requireAdmin();
  const service = createServiceSupabase()!;
  const { data: c } = await service.from("contacts").select("email, profile_id").eq("id", contactId).single();
  if (!c) return;
  if (c.profile_id) back(c.email, "They have an account: remove it from Riders, or ask the professional to close theirs.", "error");
  await service.from("pending_alerts").delete().eq("email", c.email);
  await service.from("contacts").delete().eq("id", contactId);
  await suppress(service, c.email, "admin", "deleted on request");
  revalidatePath("/admin/audience");
  redirect(`/admin/audience?done=${encodeURIComponent("Deleted. The address is kept only on the do-not-email list.")}`);
}

/**
 * New words for a consent box: a new version, never an edit, so every
 * consent row keeps pointing at the words that person saw.
 */
export async function addWording(fd: FormData) {
  const { supabase, userId } = await requireAdmin();
  const purpose = formText(fd, "purpose", 30) as Purpose;
  const body = formText(fd, "body", 500);
  if (!PURPOSES.includes(purpose)) redirect("/admin/audience?error=Unknown%20purpose");
  if (body.length < 20) redirect(`/admin/audience?error=${encodeURIComponent("Write the whole sentence people will see beside the box.")}`);
  const { data: last } = await supabase.from("consent_wordings").select("version, body").eq("purpose", purpose).order("version", { ascending: false }).limit(1).maybeSingle();
  if (last?.body === body) redirect("/admin/audience?done=Nothing%20had%20changed.");
  const { error } = await supabase.from("consent_wordings").insert({ purpose, version: (last?.version ?? 0) + 1, body, created_by: userId });
  if (error) redirect(`/admin/audience?error=${encodeURIComponent(error.message)}`);
  revalidateTag(CMS_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  redirect(`/admin/audience?done=${encodeURIComponent(`Saved as version ${(last?.version ?? 0) + 1}. Forms show it now; earlier consents keep the words they agreed to.`)}`);
}
