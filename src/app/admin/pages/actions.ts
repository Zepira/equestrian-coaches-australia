"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CMS_TAG, fillVariables, sameShape } from "@/lib/cms/read";
import { CONTENT_DEFAULTS, type ContentKey } from "@/lib/cms/content-defaults";
import { emailBySlug, OPTIONAL_FIELDS, pageBySlug, PROMOTIONAL } from "@/lib/cms/registry";
import { requireAdmin } from "@/lib/admin";
import { sendEmail } from "@/lib/email";
import type { SaveResult } from "../content-editor";

/**
 * Saves for the Pages and Emails screens (§10). A block is written only if
 * it has its default's shape and no empty text, so a page never renders a
 * half-filled block; an email is also refused if it names a variable the
 * site can't fill. Each save writes only the blocks that changed (the
 * content_history trigger records who and when) and clears the pages that
 * show them.
 */

type Json = unknown;

function clean(v: Json): Json {
  if (typeof v === "string") return v.replace(/\r\n?/g, "\n").trim();
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)]));
  return v;
}

/** "2026-11-01" and a day that exists (not 2026-99-01 or 2026-02-30). */
function realDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** The first problem with a block, in words, or null. */
function problem(key: ContentKey, value: Json): string | null {
  const def = CONTENT_DEFAULTS[key] as Record<string, unknown>;
  if (!sameShape(value, def)) return "Something in it isn't the right kind of thing. Reload and try again.";
  const v = value as Record<string, unknown>;
  const optional = OPTIONAL_FIELDS[key] ?? [];
  for (const [field, x] of Object.entries(v)) {
    if (typeof x === "string" && !x && !optional.includes(field)) return `"${field}" is empty.`;
    if ((field === "starts" || field === "ends") && typeof x === "string" && x && !realDate(x)) return `Write "${field}" as a real date, like 2026-11-01.`;
    if (field === "audience" && !["everyone", "logged_out", "riders", "coaches", "horse_care"].includes(String(x))) return "Audience is one of: everyone, logged_out, riders, coaches, horse_care.";
    if (field === "linkHref" && typeof x === "string" && x && !/^(\/|https:\/\/)/.test(x)) return "The link starts with / or https://.";
    if (Array.isArray(x)) {
      if (x.some((i) => typeof i === "string" && !i)) return `"${field}" has an empty line. Remove it or fill it in.`;
      if (x.some((i) => i && typeof i === "object" && !(i as { title: string }).title)) return `An item in "${field}" has no heading.`;
      if (field === "emphasis" && Array.isArray(v.words) && x.some((n) => (n as number) >= (v.words as string[]).length)) {
        return "An italic word number is past the end of the headline.";
      }
    }
  }
  return null;
}

function parseDraft(fd: FormData, keys: ContentKey[]): { values: Record<string, Json> } | { error: string } {
  let raw: Record<string, Json>;
  try {
    raw = JSON.parse(String(fd.get("blocks") ?? "{}"));
  } catch {
    return { error: "The form didn't send properly. Reload and try again." };
  }
  const values: Record<string, Json> = {};
  for (const key of keys) {
    if (!(key in raw)) return { error: "The form didn't send properly. Reload and try again." };
    values[key] = clean(raw[key]);
  }
  return { values };
}

async function write(values: Record<string, Json>): Promise<{ saved: number } | { error: string }> {
  const { supabase } = await requireAdmin();
  let saved = 0;
  for (const [key, value] of Object.entries(values)) {
    const { data: current } = await supabase.from("content_blocks").select("value").eq("key", key).maybeSingle();
    if (current && JSON.stringify(current.value) === JSON.stringify(value)) continue;
    // Update, else insert: an upsert would fire both history triggers.
    const { data: updated, error } = await supabase.from("content_blocks").update({ value }).eq("key", key).select("key");
    if (error) return { error: error.message };
    if (!updated?.length) {
      const { error: insertError } = await supabase.from("content_blocks").insert({ key, value });
      if (insertError) return { error: insertError.message };
    }
    saved++;
  }
  revalidateTag(CMS_TAG, { expire: 0 });
  return { saved };
}

export async function savePage(slug: string, _prev: SaveResult, fd: FormData): Promise<SaveResult> {
  const page = pageBySlug(slug);
  if (!page) return { ok: false, message: "Unknown page." };
  const parsed = parseDraft(fd, page.keys);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  for (const key of page.keys) {
    const p = problem(key, parsed.values[key]);
    if (p) return { ok: false, message: p };
  }
  const result = await write(parsed.values);
  if ("error" in result) return { ok: false, message: result.error };
  for (const r of page.revalidate) {
    if (Array.isArray(r)) revalidatePath(r[0], r[1]);
    else revalidatePath(r);
  }
  revalidatePath(`/admin/pages/${slug}`);
  return { ok: true, message: result.saved ? "Saved. It's live now." : "Nothing had changed." };
}

/** {names} in an email that the site can't fill. */
function unknownVariables(slug: string, value: Record<string, unknown>): string[] {
  const allowed = new Set(emailBySlug(slug)?.vars.map((v) => v.name) ?? []);
  const used = Object.values(value)
    .filter((x): x is string => typeof x === "string")
    .flatMap((t) => [...t.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]));
  return [...new Set(used.filter((n) => !allowed.has(n)))];
}

function checkEmail(slug: string, fd: FormData): { key: ContentKey; value: Record<string, unknown> } | { error: string } {
  const email = emailBySlug(slug);
  if (!email) return { error: "Unknown email." };
  const parsed = parseDraft(fd, [email.key]);
  if ("error" in parsed) return parsed;
  const value = parsed.values[email.key] as Record<string, unknown>;
  const p = problem(email.key, value);
  if (p) return { error: p };
  const unknown = unknownVariables(slug, value);
  if (unknown.length) return { error: `The site can't fill ${unknown.map((n) => `{${n}}`).join(", ")}. Use one of the variables listed.` };
  // A factual email that promotes anything becomes commercial in law, and
  // would go to people who never agreed to marketing.
  if (email!.class === "factual") {
    const words = Object.values(value).filter((x): x is string => typeof x === "string").join(" ").replace(/\{[a-z_]+\}/g, "");
    const hit = words.match(PROMOTIONAL);
    if (hit) return { error: `"${hit[0]}" is promotional, and this email is factual: it goes to everyone it concerns, consent or not. Take it out.` };
  }
  return { key: email.key, value };
}

export async function saveEmail(slug: string, _prev: SaveResult, fd: FormData): Promise<SaveResult> {
  const checked = checkEmail(slug, fd);
  if ("error" in checked) return { ok: false, message: checked.error };
  const result = await write({ [checked.key]: checked.value });
  if ("error" in result) return { ok: false, message: result.error };
  revalidatePath(`/admin/emails/${slug}`);
  return { ok: true, message: result.saved ? "Saved. The next one sent uses it." : "Nothing had changed." };
}

/**
 * "Send me a test": the draft as it stands in the form (saved or not),
 * filled with the sample values, to the admin who pressed it. Without
 * Resend it goes to the server log, like every other email.
 */
export async function sendTestEmail(slug: string, _prev: SaveResult, fd: FormData): Promise<SaveResult> {
  const { supabase } = await requireAdmin();
  const checked = checkEmail(slug, fd);
  if ("error" in checked) return { ok: false, message: checked.error };
  const { data: auth } = await supabase.auth.getUser();
  const to = auth.user?.email;
  if (!to) return { ok: false, message: "Your account has no email address." };
  const vars = Object.fromEntries((emailBySlug(slug)?.vars ?? []).map((v) => [v.name, v.sample]));
  const f = (t: string) => fillVariables(t, vars);
  const { subject, ...rest } = checked.value as { subject: string } & Record<string, string>;
  const result = await sendEmail({
    to,
    subject: `[Test] ${f(subject)}`,
    text: Object.values(rest).map(f).join("\n\n"),
  });
  if (result === "failed") return { ok: false, message: "It didn't send. Try again in a minute." };
  return { ok: true, message: result === "sent" ? `Sent to ${to}.` : `Email isn't set up yet, so the test went to the server log instead of ${to}.` };
}
