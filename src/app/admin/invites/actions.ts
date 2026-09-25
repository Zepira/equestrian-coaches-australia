"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmail } from "@/lib/settings";
import { createServiceSupabase } from "@/lib/supabase/service";
import { currentWording, ensureContact, recordConsent } from "@/lib/audience";

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
  // An invite goes to a published business address, with a record of where
  // it was found (Spam Act, inferred consent), and never to someone who asked
  // us to stop (The Marketing Engine §05.5).
  const foundAt = get("address_source_url", 300);
  if (!/^https?:\/\//.test(foundAt)) redirect(`/admin/invites?error=${encodeURIComponent("Paste the page where their business email is published (their website or business page).")}`);
  const service = createServiceSupabase();
  if (service) {
    const { data: blocked } = await service.from("suppressions").select("reason").eq("email", email).limit(1);
    if (blocked?.length) redirect(`/admin/invites?error=${encodeURIComponent("That address is on our do-not-email list, so we can't invite it.")}`);
  }
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
    address_source_url: foundAt,
    address_found_on: new Date().toISOString().slice(0, 10),
  });
  if (!error && service) {
    const contact = await ensureContact(service, email);
    const wording = await currentWording(service, "invite");
    await recordConsent(service, { contactId: contact.id, purpose: "invite", action: "grant", type: "published_address", wordingId: wording?.id, source: `invite: ${foundAt}`.slice(0, 300), createdBy: user?.id ?? null });
  }
  if (error) redirect(`/admin/invites?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/invites");
  redirect("/admin/invites?created=1");
}

/**
 * Resend (§10): an unused invite gets another 30 days, so the same link
 * works again. The link still goes out in your own message.
 */
export async function renewInvite(inviteId: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) throw new Error("Not an admin.");
  const { error } = await supabase
    .from("invites")
    .update({ expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString() })
    .eq("id", inviteId)
    .is("used_at", null);
  if (error) throw error;
  revalidatePath("/admin/invites");
}
