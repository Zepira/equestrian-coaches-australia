"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { inputClass, labelClass } from "@/components/ui/field";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ResendLink } from "@/components/resend-link";
import { friendlyAuthError } from "@/lib/friendly-error";
import { confirmRedirect } from "@/lib/site-url";

export function ForgotPasswordForm({ supportPhone = "" }: { supportPhone?: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Password reset isn't connected yet.");
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        // /auth/confirm, not /auth/callback: the reset link then works in
        // whichever browser opens the email, not only this one.
        redirectTo: confirmRedirect(window.location.origin, "/reset-password"),
      });
      // Deliberately don't branch on success vs "no account with that
      // email" — Supabase itself returns success either way for this call
      // (it never reveals whether an email is registered), and showing the
      // same "check your email" message regardless is the correct
      // behaviour, not a bug to fix.
      if (resetError) {
        setError(friendlyAuthError(resetError, supportPhone));
        return;
      }
      setSent(true);
    } catch (err) {
      setError(friendlyAuthError(err, supportPhone));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account"
      title={sent ? "Check your email" : "Reset your password"}
      lead={sent ? <>We sent a reset link to <strong className="font-medium text-ink break-all">{email}</strong>. It works once.</> : "Enter the email on your account and we'll send you a link to set a new password."}
      footer={
        <Link href="/login" className="font-medium text-accent">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <>
          <p className="mb-4 text-[14px] leading-[1.5] text-muted">
            You can open it on your phone or in any browser. Nothing after a minute? Check your spam folder. If that address has no account with us, no email is sent.
          </p>
          <ResendLink kind="recovery" email={email} supportPhone={supportPhone} startWaiting />
        </>
      ) : (
        <>
          {!isSupabaseConfigured && (
            <p className="mb-4 rounded-[12px] border border-border bg-shade px-3.5 py-3 text-[13.5px] leading-[1.5] text-muted">
              Password reset isn&apos;t connected yet, so this form is only a preview.
            </p>
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

            {error && <p role="alert" className="text-[13.5px] text-accent">{error}</p>}

            <Button type="submit" disabled={loading} className="mt-1 h-12 w-full text-[15px]">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
