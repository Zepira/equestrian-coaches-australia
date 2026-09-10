"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { inputClass, labelClass } from "@/components/ui/field";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
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
      setError("Auth isn't connected yet — Supabase project pending (build plan, phase 2).");
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      // Deliberately don't branch on success vs "no account with that
      // email" — Supabase itself returns success either way for this call
      // (it never reveals whether an email is registered), and showing the
      // same "check your email" message regardless is the correct
      // behaviour, not a bug to fix.
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account"
      title={sent ? "Check your email" : "Reset your password"}
      lead={sent ? <>We sent a reset link to <strong className="font-medium text-ink">{email}</strong>. It works once.</> : "Enter the email on your account and we'll send you a link to set a new password."}
      footer={
        <Link href="/login" className="font-medium text-accent">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <p className="text-[14px] leading-[1.5] text-muted">Nothing there after a minute? Check spam — and if that address has no account, nothing is sent.</p>
      ) : (
        <>
          {!isSupabaseConfigured && (
            <p className="mb-4 rounded-[12px] border border-border bg-shade px-3.5 py-3 text-[13.5px] leading-[1.5] text-muted">
              Auth isn&apos;t connected yet — this form is a preview until Supabase is set up.
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
