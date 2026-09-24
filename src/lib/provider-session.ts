import { createClient } from "@/lib/supabase/server";
import { ensureProvider } from "@/lib/supabase/queries";

/**
 * For server actions that edit a provider profile: the signed-in user's
 * client, their user id, and the id of the provider they edit (created for
 * an older account that has none). Throws when nobody is signed in.
 *
 * Every provider table keys on providerId, never on the user id: a profile
 * is not an account (The Site as a CMS §04 D).
 */
export async function requireProvider() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
  const provider = await ensureProvider(supabase, user.id, profile?.name ?? "Coach");
  return { supabase, userId: user.id, providerId: provider.id, provider };
}
