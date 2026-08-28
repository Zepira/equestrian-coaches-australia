import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// Server-side Supabase client — use inside Server Components, Route
// Handlers and Server Actions. Reads/writes the session via cookies.
// Returns null until env vars are set (see .env.example) — callers must
// handle that case rather than assume a live project (phase 2, not yet
// pointed at a real Supabase project).
export async function createClient() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore since
            // middleware refreshes the session on every request anyway.
          }
        },
      },
    }
  );
}
