import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AuthState = {
  loggedIn: boolean;
  role: "rider" | "coach" | null;
};

const SIGNED_OUT: AuthState = { loggedIn: false, role: null };

/**
 * Tracks the current Supabase session and the signed-in user's role, live —
 * used by the header to decide what to show in place of "Log in".
 * Resolves to `SIGNED_OUT` (not a loading state) until Supabase is
 * configured or a session is confirmed, so the header never has to render
 * a third "checking..." state.
 */
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(SIGNED_OUT);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return; // not pointed at a live Supabase project yet

    async function loadRole(client: NonNullable<typeof supabase>, userId: string) {
      const { data } = await client.from("profiles").select("role").eq("id", userId).single();
      setState({ loggedIn: true, role: (data?.role as AuthState["role"]) ?? null });
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadRole(supabase, user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadRole(supabase, session.user.id);
      else setState(SIGNED_OUT);
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
