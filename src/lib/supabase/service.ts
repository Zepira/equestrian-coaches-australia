import { createClient } from "@supabase/supabase-js";

/**
 * The service-role client, for the writes RLS deliberately doesn't allow a
 * signed-in user: billing (subscriptions), review decisions, creating a
 * provider row outside the signup trigger. Server only. Returns null when
 * Supabase isn't configured, like the other clients.
 */
export function createServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
