"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { AuthShell } from "@/components/auth-shell";
import { inputClass, labelClass } from "@/components/ui/field";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ResendLink } from "@/components/resend-link";
import { authErrorKind, friendlyAuthError } from "@/lib/friendly-error";
import { safeNextPath } from "@/lib/site-url";

/**
 * The log in form. Reads two things from the address: `next` (only ever a
 * path on this site, see safeNextPath) and `error`, which /auth/confirm and
 * /auth/callback set when an emailed link didn't work. That used to be
 * ignored, so a coach whose link failed saw a blank form and gave up; now
 * they're told what happened and can send themselves a new link.
 */
export function LoginForm({ supportPhone = "" }: { supportPhone?: string }) {
  const searchParams = useSearchParams();
  const explicitNext = searchParams.get("next") ? safeNextPath(searchParams.get("next"), "") : "";
  const linkFailed = searchParams.get("error") === "link" || searchParams.get("error") === "auth-callback-failed";
  const linkKind = searchParams.get("kind") === "recovery" ? "recovery" : "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnconfirmed(null);

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Log in isn't connected yet.");
      return;
    }

    // Everything below can throw outright (network failure, bad Supabase
    // URL/key, CORS) rather than resolve with an { error } field — without
    // this try/catch that left setLoading/setError never called at all: no
    // error, no spinner reset, the form just silently sits there looking
    // like nothing happened. Every exit path below always runs setLoading.
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        // Not confirmed yet: offer the email again rather than a dead end.
        if (authErrorKind(signInError) === "email_not_confirmed") setUnconfirmed(email);
        setError(friendlyAuthError(signInError, supportPhone));
        return;
      }

      let next = explicitNext;
      if (!next) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        next = profile?.role === "provider" ? "/dashboard" : "/account";
      }

      // A full page load, not router.push: the header prefetched this page
      // while signed out, and a client navigation would reuse that cached
      // redirect back to /login. A fresh request carries the new session.
      window.location.assign(next);
    } catch (err) {
      setError(friendlyAuthError(err, supportPhone));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in"
      lead="Riders: your saved coaches and clinic alerts. Coaches: your dashboard."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent">
            Create an account
          </Link>
        </>
      }
    >
      {!isSupabaseConfigured && (
        <p className="mb-4 rounded-[12px] border border-border bg-shade px-3.5 py-3 text-[13.5px] leading-[1.5] text-muted">
          Log in isn&apos;t connected yet, so this form is only a preview.
        </p>
      )}

      {linkFailed && (
        <div className="mb-5 rounded-[12px] border border-border bg-shade px-3.5 py-3.5" data-link-error>
          <p role="alert" className="text-[14.5px] font-medium leading-[1.45] text-ink">
            That link didn&apos;t work. It may have expired, or been opened already.
          </p>
          <p className="mt-1 mb-3 text-[13.5px] leading-[1.5] text-muted">
            {linkKind === "recovery"
              ? "Put in your email and we'll send a new link to set your password."
              : "Put in your email and we'll send a new one. If you've already confirmed, just log in below."}
          </p>
          <ResendLink kind={linkKind} supportPhone={supportPhone} label={linkKind === "recovery" ? "Send a new reset link" : "Send a new link"} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block">
          <span className={labelClass}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </label>
        <label className="block">
          <span className={labelClass}>Password</span>
          <PasswordInput value={password} onChange={setPassword} required />
          {/* Comes after the password input in the DOM (not beside its
              label) so tab order is email -> password -> show/hide -> this,
              not email -> this -> password. */}
          <Link href="/forgot-password" className="mt-2 inline-block text-[13.5px] font-medium text-accent">
            Forgot password?
          </Link>
        </label>

        {error && <p role="alert" className="text-[13.5px] leading-[1.5] text-accent">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-1 h-12 w-full text-[15px]">
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>

      {unconfirmed && (
        <div className="mt-4">
          <ResendLink kind="signup" email={unconfirmed} supportPhone={supportPhone} />
        </div>
      )}
    </AuthShell>
  );
}
