"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { AuthShell } from "@/components/auth-shell";
import { inputClass, labelClass } from "@/components/ui/field";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitNext = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Everything below can throw outright (network failure, bad Supabase
    // URL/key, CORS) rather than resolve with an { error } field — without
    // this try/catch that left setLoading/setError never called at all: no
    // error, no spinner reset, the form just silently sits there looking
    // like nothing happened. Every exit path below always runs setLoading.
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      let next = explicitNext;
      if (!next) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        next = profile?.role === "coach" ? "/dashboard" : "/account";
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong logging in — try again.");
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

        {error && <p role="alert" className="text-[13.5px] text-accent">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-1 h-12 w-full text-[15px]">
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
