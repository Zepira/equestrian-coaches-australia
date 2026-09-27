import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/site-url";

// The PKCE redirect back from Supabase, which only works in the browser that
// started the sign-up (the code verifier is a cookie there). New emails go
// to /auth/confirm instead, which works in any browser; this stays for links
// already sent before the switch.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/account");

  const supabase = await createClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link${next === "/reset-password" ? "&kind=recovery" : ""}`);
}
