import { createBrowserClient } from "@supabase/ssr";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Browser-side Supabase client — use inside client components ("use client").
// Returns null until NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are set (see
// .env.example) — phase 2 isn't wired to a live project yet, so every
// caller must handle the null case rather than assume auth is available.
export function createClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
