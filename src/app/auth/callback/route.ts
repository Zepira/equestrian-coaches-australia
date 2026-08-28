import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect back from Supabase after email confirmation or a
// magic link. Exchanges the one-time code for a session, then sends the
// user on to wherever they were headed.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  const supabase = await createClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
