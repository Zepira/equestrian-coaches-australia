"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { AuthShell } from "@/components/auth-shell";
import { labelClass } from "@/components/ui/field";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ResendLink } from "@/components/resend-link";
import { friendlyAuthError } from "@/lib/friendly-error";

// Reached only via the link in the reset email: /auth/confirm verifies the
// recovery token (or /auth/callback, for older links) and signs them in
// before redirecting here, so by the time
// this page loads there should already be a live (recovery) session to
// update. No session (link expired, already used, or landed here cold)
// shows a plain "request a new one" state instead of a broken form.
export function ResetPasswordForm({ supportPhone = "" }: { supportPhone?: string }) {
  const [status, setStatus] = useState<"checking" | "ready" | "expired">(
    isSupabaseConfigured ? "checking" : "expired"
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      setStatus(user ? "ready" : "expired");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Password reset isn't connected yet.");
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(friendlyAuthError(updateError, supportPhone));
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let next = "/account";
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        next = profile?.role === "provider" ? "/dashboard" : "/account";
      }

      setDone(true);
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

  if (status === "checking") return null;

  if (status === "expired") {
    return (
      <AuthShell
        eyebrow="Account"
        title="Link expired"
        lead="That link didn't work. It may have expired, or been opened already. Each reset link works once."
        footer={
          <Link href="/login" className="font-medium text-accent">
            Back to log in
          </Link>
        }
      >
        <ResendLink kind="recovery" supportPhone={supportPhone} />
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Account" title="Set a new password" lead="At least eight characters. You'll be signed in once it's saved.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block">
          <span className={labelClass}>New password</span>
          <PasswordInput value={password} onChange={setPassword} minLength={8} required />
        </label>
        <label className="block">
          <span className={labelClass}>Confirm new password</span>
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} minLength={8} required />
        </label>

        {error && <p role="alert" className="text-[13.5px] text-accent">{error}</p>}

        <Button type="submit" disabled={loading || done} className="mt-1 h-12 w-full text-[15px]">
          {loading ? "Saving…" : "Set new password"}
        </Button>
      </form>
    </AuthShell>
  );
}
