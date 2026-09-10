"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

// Reached only via the link in the reset email — /auth/callback exchanges
// the recovery code for a session before redirecting here, so by the time
// this page loads there should already be a live (recovery) session to
// update. No session (link expired, already used, or landed here cold)
// shows a plain "request a new one" state instead of a broken form.
export default function ResetPasswordPage() {
  const router = useRouter();
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
      setError("Auth isn't connected yet — Supabase project pending (build plan, phase 2).");
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let next = "/account";
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        next = profile?.role === "coach" ? "/dashboard" : "/account";
      }

      setDone(true);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") return null;

  if (status === "expired") {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-fg">Link expired</h1>
        <p className="mt-2 text-sm text-muted">
          This reset link is no longer valid — links only work once and expire after a while.
        </p>
        <Link href="/forgot-password" className="mt-4 inline-block font-medium text-accent">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-fg">Set a new password</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">New password</span>
          <PasswordInput value={password} onChange={setPassword} minLength={8} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Confirm new password</span>
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} minLength={8} required />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading || done} className="mt-2 w-full">
          {loading ? "Saving…" : "Set new password"}
        </Button>
      </form>
    </div>
  );
}
