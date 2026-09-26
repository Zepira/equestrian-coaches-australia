"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { CMS_TAG } from "@/lib/cms/read";
import { formText, requireAdmin } from "@/lib/admin";
import { reservedSlugError } from "@/lib/reserved-slugs";
import { GLYPHS } from "@/components/profession-glyph";
import { TIERS } from "@/lib/tiers";

/**
 * The Professions screen (§10): everything a profession says and does, in
 * the terms row and its profession_details row. A profession touches every
 * page (menus, footer, door colours, sitemap, search), so a save clears the
 * whole site's cache, not a list of paths. change_log records each save.
 */

export type ProfessionSaveState = { ok: boolean; message: string } | null;

const COMPLETENESS_KEYS = ["photo", "bio", "terms", "location", "testimonials", "video"] as const;
const LAUNCH = ["draft", "taking_signups", "live"] as const;
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function everywhere() {
  revalidateTag(CMS_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}

/** Numbered rows (steps.0.title, steps.0.body …) back into a list, blanks dropped. */
function rows(fd: FormData, prefix: string, a: string, b: string, max = 12) {
  const out: Record<string, string>[] = [];
  for (let i = 0; i < max; i++) {
    const x = formText(fd, `${prefix}.${i}.${a}`, 200);
    const y = formText(fd, `${prefix}.${i}.${b}`, 2000);
    if (x || y) out.push({ [a]: x, [b]: y });
  }
  return out;
}

export async function saveProfession(termId: string, _prev: ProfessionSaveState, fd: FormData): Promise<ProfessionSaveState> {
  const { supabase } = await requireAdmin();
  const fail = (message: string) => ({ ok: false, message });

  const [{ data: term }, { count: providers }] = await Promise.all([
    supabase.from("terms").select("slug, profession_details(launch_state)").eq("id", termId).eq("kind", "profession").single(),
    supabase.from("provider_terms").select("provider_id", { count: "exact", head: true }).eq("term_id", termId),
  ]);
  if (!term) return fail("That profession no longer exists.");

  const name = formText(fd, "name", 40);
  const singular = formText(fd, "singular", 40).toLowerCase();
  const plural = formText(fd, "plural", 40).toLowerCase();
  const jobTitle = formText(fd, "job_title", 60);
  const blurb = formText(fd, "blurb", 300);
  if (!name || !singular || !plural) return fail("Name, singular and plural are all needed.");
  if (!jobTitle) return fail("A job title is needed. It goes into the profile's search listing.");
  if (!blurb) return fail("A one-line description is needed. It shows on the section page and the tiles.");

  const door = formText(fd, "door");
  if (door !== "coaches" && door !== "horse_care") return fail("Pick a door.");
  const glyph = formText(fd, "glyph_key");
  if (!(glyph in GLYPHS)) return fail("Pick an icon.");
  const launch = formText(fd, "launch_state") as (typeof LAUNCH)[number];
  if (!LAUNCH.includes(launch)) return fail("Pick a launch state.");

  // The address can change only while nobody can see it and nobody's on it.
  let slug = term.slug as string;
  const wantedSlug = slugify(formText(fd, "slug", 60) || slug);
  if (wantedSlug !== slug) {
    const current = (term.profession_details as unknown as { launch_state: string } | null)?.launch_state;
    if (current !== "draft" || (providers ?? 0) > 0) return fail("The address can only change while the profession is a draft with nobody on it.");
    const reserved = reservedSlugError("profession", wantedSlug);
    if (reserved) return fail(reserved);
    slug = wantedSlug;
  }

  const options = rows(fd, "options", "label", "value").map((o) => ({ label: o.label, value: slugify(o.value || o.label).replace(/-/g, "_") }));
  if (!options.length || options.some((o) => !o.label)) return fail("Give at least one enquiry option, each with a label.");
  if (new Set(options.map((o) => o.value)).size !== options.length) return fail("Two enquiry options have the same value.");

  const steps = rows(fd, "steps", "title", "body");
  const faq = rows(fd, "faq", "title", "body");
  if ([...steps, ...faq].some((s) => !s.title || !s.body)) return fail("Every step and question needs both a heading and its text.");

  const completeness = [];
  for (const key of COMPLETENESS_KEYS) {
    if (fd.get(`completeness.${key}.on`) !== "on") continue;
    const label = formText(fd, `completeness.${key}.label`, 60);
    const weight = Number(formText(fd, `completeness.${key}.weight`) || "1");
    if (!label) return fail(`The checklist item "${key}" is switched on but has no wording.`);
    if (!Number.isInteger(weight) || weight < 1 || weight > 5) return fail("Checklist weights are whole numbers from 1 to 5.");
    completeness.push({ key, label, weight });
  }
  if (completeness.length < 3) return fail("Keep at least three items on the profile checklist.");

  // Only this profession's own specialities count as common.
  const wanted = [...new Set(fd.getAll("common").map(String))];
  let commonTermIds: string[] = [];
  if (wanted.length) {
    const { data: own } = await supabase.from("terms").select("id").eq("kind", "discipline").eq("parent_id", termId).in("id", wanted);
    const ok = new Set((own ?? []).map((t) => t.id as string));
    commonTermIds = wanted.filter((id) => ok.has(id));
  }

  const tierLabels = Object.fromEntries(TIERS.map((t) => [t, formText(fd, `tier.${t}`, 30)]).filter(([, v]) => v));

  const { error: termError } = await supabase
    .from("terms")
    .update({ name, slug, blurb, updated_at: new Date().toISOString() })
    .eq("id", termId);
  if (termError) return fail(termError.code === "23505" ? `Another profession already uses /${slug}.` : termError.message);

  const { error } = await supabase
    .from("profession_details")
    .update({
      door,
      glyph_key: glyph,
      launch_state: launch,
      singular,
      plural,
      short_name: formText(fd, "short_name", 20) || null,
      term_noun: formText(fd, "term_noun", 30).toLowerCase() || "speciality",
      term_noun_plural: formText(fd, "term_noun_plural", 30).toLowerCase() || "specialities",
      audience_noun: formText(fd, "audience_noun", 30).toLowerCase() || "horse owner",
      years_label: formText(fd, "years_label", 40).toLowerCase() || "years",
      job_title: jobTitle,
      hero_headline: formText(fd, "hero_headline", 80),
      hero_lead: formText(fd, "hero_lead", 400),
      hero_lead_short: formText(fd, "hero_lead_short", 200),
      pitch: formText(fd, "pitch", 2000),
      steps,
      faq,
      enquiry_options: options,
      tier_labels: tierLabels,
      completeness,
      events_enabled: fd.get("events_enabled") === "on",
      remote_allowed: fd.get("remote_allowed") === "on",
      common_term_ids: commonTermIds,
      updated_at: new Date().toISOString(),
    })
    .eq("term_id", termId);
  if (error) return fail(error.message);

  everywhere();
  revalidatePath(`/admin/professions/${termId}`);
  return { ok: true, message: launch === "live" ? "Saved. It's live on the site now." : "Saved." };
}

/** A new profession starts as a draft: only admins see it until it's set live. */
export async function createProfession(fd: FormData) {
  const { supabase } = await requireAdmin();
  const name = formText(fd, "name", 40);
  const singular = formText(fd, "singular", 40).toLowerCase();
  const door = formText(fd, "door") === "coaches" ? "coaches" : "horse_care";
  const back = (m: string) => redirect(`/admin/professions?error=${encodeURIComponent(m)}`);
  if (!name || !singular) back("Give the name (plural, as in the menu) and the singular.");
  const slug = slugify(name);
  const reserved = reservedSlugError("profession", slug);
  if (reserved) back(reserved);

  const { data: last } = await supabase.from("terms").select("sort_order").eq("kind", "profession").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data: term, error } = await supabase
    .from("terms")
    .insert({ kind: "profession", slug, name, blurb: "", generates_pages: true, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error || !term) back(error?.code === "23505" ? `A profession at /${slug} already exists.` : (error?.message ?? "Couldn't add it."));

  const { error: detailError } = await supabase.from("profession_details").insert({
    term_id: term!.id,
    door,
    glyph_key: door === "coaches" ? "coaches" : "farriers",
    launch_state: "draft",
    singular,
    plural: name.toLowerCase(),
    job_title: singular.charAt(0).toUpperCase() + singular.slice(1),
    enquiry_options: door === "coaches"
      ? [{ value: "regular", label: "Regular lessons" }, { value: "one_off", label: "One-off lesson" }]
      : [{ value: "regular", label: "Regular visits" }, { value: "one_off", label: "One-off visit" }],
    completeness: [
      { key: "photo", label: "A photo of you at work", weight: 1 },
      { key: "bio", label: "Bio written", weight: 1 },
      { key: "terms", label: "Specialities tagged", weight: 1 },
      { key: "location", label: "Location set", weight: 1 },
      { key: "testimonials", label: "Three testimonials", weight: 1 },
      { key: "video", label: "Intro video", weight: 1 },
    ],
  });
  if (detailError) {
    await supabase.from("terms").delete().eq("id", term!.id);
    back(detailError.message);
  }
  everywhere();
  redirect(`/admin/professions/${term!.id}`);
}

/** Menu order: swap with the neighbour above or below. */
export async function moveProfession(termId: string, direction: "up" | "down") {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("terms").select("id, sort_order").eq("kind", "profession").order("sort_order");
  const list = data ?? [];
  const i = list.findIndex((r) => r.id === termId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  // Renumber the whole list so ties can't make a swap a no-op.
  const order = list.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [n, id] of order.entries()) await supabase.from("terms").update({ sort_order: n + 1 }).eq("id", id);
  everywhere();
  revalidatePath("/admin/professions");
}

export async function uploadTermImage(termId: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const file = fd.get("image") as File | null;
  if (!file || file.size === 0 || !file.type.startsWith("image/")) throw new Error("That isn't an image.");
  const { data: term } = await supabase.from("terms").select("slug, kind, image_path").eq("id", termId).single();
  if (!term) throw new Error("Not found.");
  const path = `${term.kind}/${term.slug}/${Date.now()}.${(file.name.split(".").pop() ?? "jpg").toLowerCase()}`;
  const { error: upErr } = await supabase.storage.from("term-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (upErr) throw upErr;
  await supabase.from("terms").update({ image_path: path, updated_at: new Date().toISOString() }).eq("id", termId);
  if (term.image_path) await supabase.storage.from("term-images").remove([term.image_path]);
  everywhere();
}

export async function removeTermImage(termId: string) {
  const { supabase } = await requireAdmin();
  const { data: term } = await supabase.from("terms").select("image_path").eq("id", termId).single();
  if (!term?.image_path) return;
  await supabase.from("terms").update({ image_path: null, updated_at: new Date().toISOString() }).eq("id", termId);
  await supabase.storage.from("term-images").remove([term.image_path]);
  everywhere();
}
