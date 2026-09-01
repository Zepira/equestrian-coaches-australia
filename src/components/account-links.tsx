import Link from "next/link";
import type { AuthState } from "@/hooks/use-auth-state";

const SIGNUP_BUTTON_CLASSNAME =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:opacity-90";

/**
 * The auth-dependent tail of the header nav — "Log in" / "List your
 * profile" when signed out, "Dashboard" or "My account" / "Log out" when
 * signed in. Shared between the desktop nav and the mobile menu panel,
 * which pass their own link styling and close-on-navigate handler in.
 */
export function AccountLinks({
  auth,
  linkClassName,
  onNavigate,
}: {
  auth: AuthState;
  linkClassName: string;
  onNavigate?: () => void;
}) {
  if (!auth.loggedIn) {
    return (
      <>
        <Link href="/login" onClick={onNavigate} className={linkClassName}>
          Log in
        </Link>
        <Link href="/signup?role=coach" onClick={onNavigate} className={SIGNUP_BUTTON_CLASSNAME}>
          List your profile
        </Link>
      </>
    );
  }

  const accountHref = auth.role === "coach" ? "/dashboard" : "/account";
  const accountLabel = auth.role === "coach" ? "Dashboard" : "My account";

  return (
    <>
      <Link href={accountHref} onClick={onNavigate} className={linkClassName}>
        {accountLabel}
      </Link>
      <form action="/auth/sign-out" method="post">
        <button type="submit" className={linkClassName}>
          Log out
        </button>
      </form>
    </>
  );
}
