/**
 * Supabase's auth errors, in words a coach who isn't comfortable online can
 * act on. "AuthApiError: Email not confirmed" means nothing to most people;
 * "You haven't confirmed your email yet" tells them what to do.
 *
 * Used by sign-up, log in, forgot password and reset password. No imports, so
 * it is safe in client components. The support phone number comes from the
 * `support_phone` setting, passed down as a prop; when it's empty the
 * fallback leaves the "ring us" part out.
 */

export type AuthErrorKind =
  | "already_registered"
  | "weak_password"
  | "same_password"
  | "invalid_login"
  | "email_not_confirmed"
  | "bad_email"
  | "rate_limited"
  | "network"
  | "unknown";

type ErrorLike = { code?: unknown; status?: unknown; message?: unknown; name?: unknown };

/** Which of the common auth failures this is, from Supabase's error code first and its message second. */
export function authErrorKind(err: unknown): AuthErrorKind {
  const e = (err && typeof err === "object" ? err : { message: String(err ?? "") }) as ErrorLike;
  const code = typeof e.code === "string" ? e.code : "";
  const message = typeof e.message === "string" ? e.message.toLowerCase() : "";
  const name = typeof e.name === "string" ? e.name : "";

  if (code === "user_already_exists" || code === "email_exists" || message.includes("already registered")) return "already_registered";
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) return "email_not_confirmed";
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) return "invalid_login";
  if (code === "same_password" || message.includes("different from the old password")) return "same_password";
  if (code === "weak_password" || message.includes("password should") || message.includes("password is too")) return "weak_password";
  if (code === "email_address_invalid" || (message.includes("email") && message.includes("invalid"))) return "bad_email";
  if (code.startsWith("over_") || e.status === 429 || message.includes("rate limit") || message.includes("too many")) return "rate_limited";
  if (
    name === "AuthRetryableFetchError" ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("load failed")
  )
    return "network";
  return "unknown";
}

/** One plain sentence for an auth error. */
export function friendlyAuthError(err: unknown, supportPhone = ""): string {
  switch (authErrorKind(err)) {
    case "already_registered":
      return "You already have an account with that email. Log in instead, or reset your password if you've forgotten it.";
    case "weak_password":
      return "That password is too easy to guess. Use at least 8 characters, and mix in a number or two.";
    case "same_password":
      return "That's the password you already have. Pick a new one.";
    case "invalid_login":
      return "That email and password don't match an account. Check them and try again, or reset your password.";
    case "email_not_confirmed":
      return "You haven't confirmed your email yet. Open the link we sent you, or we can send it again.";
    case "bad_email":
      return "That email address doesn't look right. Check it for a typo.";
    case "rate_limited":
      return "Too many tries in a short time. Wait a minute, then try again.";
    case "network":
      return "We couldn't reach our server. Check your internet connection and try again.";
    default:
      return fallbackError(supportPhone);
  }
}

/** The catch-all, with the phone number when there is one. */
export function fallbackError(supportPhone = ""): string {
  const phone = supportPhone.trim();
  return phone ? `Something went wrong. Try again, or ring us on ${phone}.` : "Something went wrong. Try again in a moment.";
}
