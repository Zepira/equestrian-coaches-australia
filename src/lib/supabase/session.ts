import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * The "is anyone signed in?" prologue repeated at the top of every page that
 * renders differently for a signed-in user — returns `null` when Supabase
 * isn't configured or nobody's signed in, so callers can collapse their own
 * `if (supabase) { const {user} = ...; if (user) {...} }` nesting into one
 * `if (user) {...}` check.
 */
export async function getSessionUser(supabase: SupabaseClient | null): Promise<User | null> {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
