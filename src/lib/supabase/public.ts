import { createClient } from "@supabase/supabase-js";

/**
 * A cookie-free anon client for public, cacheable reads: professions, page
 * copy, menus, plans. The request-scoped client in ./server reads cookies,
 * which makes any page that uses it render per request; this one doesn't,
 * so the root layout and static pages can read the CMS and stay static.
 *
 * Only for data RLS already makes public. Wrap reads in unstable_cache
 * (src/lib/cms/read.ts) so they're cached and cleared by tag on admin save.
 */
export function createPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
