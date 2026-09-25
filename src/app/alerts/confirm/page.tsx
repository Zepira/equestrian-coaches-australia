import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { confirmAlert } from "../actions";

export const metadata = { title: "Confirm your alert", robots: { index: false, follow: false } };

/**
 * The link in the "Confirm your alert" email lands here. One button, so the
 * alert only starts when a person presses it: mail scanners open links in
 * emails, and would otherwise start alerts nobody asked for.
 */
export default async function ConfirmAlertPage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; email?: string }> }) {
  const { t, done, email } = await searchParams;
  if (done === "new" || done === "added") {
    return (
      <AuthShell eyebrow="Alerts" title="Your alert is on" lead="We'll email you when something matches. Every email has a link to stop it.">
        {done === "new" ? (
          <p className="text-[14px] leading-[1.5] text-muted">
            To change it later or add more,{" "}
            <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="font-medium text-accent">
              set a password
            </Link>{" "}
            for {email ?? "your email address"} and sign in.
          </p>
        ) : (
          <p className="text-[14px] leading-[1.5] text-muted">
            It&rsquo;s with your other alerts in <Link href="/account" className="font-medium text-accent">your account</Link>.
          </p>
        )}
      </AuthShell>
    );
  }
  if (done === "unknown" || !t) {
    return (
      <AuthShell eyebrow="Alerts" title="That link has expired" lead="It may already have been used, or it's more than two weeks old. Ask for the alert again from the page you were on.">
        <p className="text-[14px] text-muted">
          <Link href="/" className="font-medium text-accent">Back to the home page</Link>
        </p>
      </AuthShell>
    );
  }
  return (
    <AuthShell eyebrow="Alerts" title="Start this alert?" lead="Press the button and we'll email you when something matches. Nothing else.">
      <form action={confirmAlert}>
        <input type="hidden" name="t" value={t} />
        <Button type="submit" className="h-12 w-full text-[15px]">Start my alert</Button>
      </form>
    </AuthShell>
  );
}
