"use server";

import { createServiceSupabase } from "@/lib/supabase/service";
import { canSend, ensureContact } from "@/lib/audience";
import { sendEmail } from "@/lib/email";
import { fillVariables, getContent } from "@/lib/cms/read";
import { absoluteUrl } from "@/lib/site-url";
import { fileUrl } from "@/lib/guides";

export type DownloadResult = { ok: boolean; message: string };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A guide's download (M9): the file, emailed to the address given. Nothing
 * else is signed up for here; the subscribe card further down the page does
 * that, with its own box and confirmation.
 */
export async function requestDownload(_prev: DownloadResult, fd: FormData): Promise<DownloadResult> {
  if (String(fd.get("website") ?? "")) return { ok: true, message: "Sent." };
  const service = createServiceSupabase();
  if (!service) return { ok: false, message: "This isn't connected yet." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, message: "That email address doesn't look right." };
  const { data: g } = await service.from("guides").select("id, slug, title, download_path, download_title").eq("id", String(fd.get("guide_id") ?? "")).eq("status", "published").maybeSingle();
  if (!g?.download_path) return { ok: false, message: "This guide has no file to send." };
  const contact = await ensureContact(service, email);
  // Three a day per address, so the form can't be used to fill someone's inbox.
  const { count } = await service.from("guide_downloads").select("id", { count: "exact", head: true }).eq("contact_id", contact.id).gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 3) return { ok: false, message: "We've sent a few to that address today already. Look in your inbox, or try tomorrow." };
  if (!(await canSend(service, email, "factual")).ok) return { ok: false, message: "We can't send email to that address." };
  const copy = await getContent("email.guide_download");
  const w = await getContent("guides.words");
  const vars = { download_title: g.download_title || "file", download_url: fileUrl(service, g.download_path as string), guide_title: g.title as string, guide_url: absoluteUrl(`/guides/${g.slug}`) };
  const result = await sendEmail({ to: email, subject: fillVariables(copy.subject, vars), text: fillVariables(copy.body, vars) });
  if (result === "failed") return { ok: false, message: "It didn't send. Try again in a minute." };
  await service.from("guide_downloads").insert({ guide_id: g.id, contact_id: contact.id });
  return { ok: true, message: fillVariables(w.downloadSent, vars) };
}
