"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmail } from "@/lib/settings";

/**
 * Invites (The Site as a CMS §06.6). Kim enters who and what they do,
 * optionally starts the profile, and sends the link from her own message.
 * The link opens a pre-filled sign-up; the sign-up trigger checks the token
 * is unused and unexpired, links the new provider to the invite and records
 * the source. Nothing is public until they finish, submit and pass review.
 */
export async function createInvite(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) throw new Error("Not an admin.");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const get = (k: string, max = 120) => String(formData.get(k) ?? "").trim().slice(0, max);
  const email = get("email").toLowerCase();
  if (!isEmail(email)) redirect(`/admin/invites?error=${encodeURIComponent("That email address doesn't look right.")}`);
  const prefill = Object.fromEntries(
    (["headline", "suburb", "state", "business_name"] as const).map((k) => [k, get(k)]).filter(([, v]) => v)
  );
  const { error } = await supabase.from("invites").insert({
    email,
    name: get("name", 80),
    profession_id: get("profession_id") || null,
    prefill,
    source: get("source", 40) || "invite",
    created_by: user?.id ?? null,
  });
  if (error) redirect(`/admin/invites?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/invites");
  redirect("/admin/invites?created=1");
}
