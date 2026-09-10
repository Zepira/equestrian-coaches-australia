"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    <div className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      {sent ? (
        <div className="rounded-[var(--radius-tile)] border border-border bg-surface p-5 text-center">
          <p className="text-fg">Check your email for a reset link.</p>
          <p className="mt-1 text-sm text-muted">We sent it to {email}.</p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-fg">Reset your password</h1>
          <p className="mt-2 text-sm text-muted">
            Enter the email on your account and we&apos;ll send you a link to set a new password.
          </p>

          {!isSupabaseConfigured && (
            <p className="mt-4 rounded-[var(--radius-control)] border border-border bg-accent-soft p-3 text-sm text-fg">
              Auth isn&apos;t connected yet — this form is a preview until Supabase is set up.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-fg">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg"
                required
              />
            </label>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
