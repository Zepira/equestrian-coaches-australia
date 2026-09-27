import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/site-url";

/**
 * Where the sign-up confirmation and password reset emails land, in any
 * browser.
 *
 * /auth/callback exchanges a PKCE code, and the verifier that exchange needs is
 * a cookie in the browser that started the sign-up. Kim sends a coach a link
 * on Facebook, it opens in Messenger's own browser, the coach signs up there,
 * then opens the email in the Gmail app, which uses a different browser: no
 * cookie, no session, and they were sent to a blank log in page. Verifying the
 * hashed token from the email needs nothing from the browser that asked for
 * it, so this works wherever the link is opened.
 *
 * The email template builds the link from {{ .RedirectTo }} (the address the
 * form passed, on whichever host they signed up on) plus
 * `&token_hash={{ .TokenHash }}&type=email` or `type=recovery`. See
 * docs/auth-email-templates.md.
 */

const SIGNUP_TYPES: ReadonlySet<string> = new Set(["email", "signup"]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "";
  const recovery = type === "recovery";

  const failed = () => NextResponse.redirect(`${origin}/login?error=link${recovery ? "&kind=recovery" : ""}`);

  const supabase = await createClient();
  if (!supabase || !tokenHash || !(recovery || SIGNUP_TYPES.has(type))) return failed();

  const { data, error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });

  if (error || !data.user) {
    // A coach who taps the link twice (or whose mail app opened it once to
    // preview it) is already confirmed and signed in here. Don't tell them it
    // failed; send them on.
    if (!recovery) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) return NextResponse.redirect(`${origin}${await destination(supabase, user.id, searchParams.get("next"))}`);
    }
    return failed();
  }

  if (recovery) return NextResponse.redirect(`${origin}/reset-password`);
  return NextResponse.redirect(`${origin}${await destination(supabase, data.user.id, searchParams.get("next"))}`);
}

/** The `next` the form asked for, if it's a path on this site; otherwise onboarding for a professional and the account page for a rider. */
async function destination(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, userId: string, next: string | null): Promise<string> {
  const asked = safeNextPath(next, "");
  if (asked) return asked;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return profile?.role === "provider" ? "/onboarding" : "/account";
}
