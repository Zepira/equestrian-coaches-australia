"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { AuthShell } from "@/components/auth-shell";
import { inputClass, labelClass } from "@/components/ui/field";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "coach" ? "coach" : "rider";
  const tier = searchParams.get("tier"); // carried through to Stripe Checkout once payments ship (phase 5)
  const isCoach = role === "coach";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

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
    const next = isCoach ? `/dashboard${tier ? `?tier=${tier}` : ""}` : "/account";

    // Same reasoning as login: a thrown exception here (network failure,
    // bad Supabase URL/key, CORS) rather than a returned { error } would
    // otherwise skip every line below, including setLoading(false) — form
    // just sits there with no feedback.
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Email confirmation is on by default in Supabase — session is null
      // until the rider/coach clicks the link.
      if (data.user && !data.session) {
        setCheckEmail(true);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong creating your account — try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthShell eyebrow="One more step" title="Check your email" lead={<>We sent a confirmation link to <strong className="font-medium text-ink">{email}</strong>. Open it and you&apos;re in.</>}>
        <p className="text-[14px] leading-[1.5] text-muted">Nothing there after a minute? Check spam, or try signing up again with the right address.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={isCoach ? "For coaches" : "For riders · free, always"}
      title={isCoach ? <>List your <em className="italic text-accent">coaching</em> profile</> : "Create your account"}
      lead={isCoach ? "Sign up to build your profile — you'll choose a plan next." : "Save favourite coaches and get one email when a clinic is listed near you."}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent">
            Log in
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
          <span className={labelClass}>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
        </label>
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
          <PasswordInput value={password} onChange={setPassword} minLength={8} required />
        </label>

        {error && <p role="alert" className="text-[13.5px] text-accent">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-1 h-12 w-full text-[15px]">
          {loading ? "Creating account…" : isCoach ? "Continue to plan selection" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
