"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setLoading(false);

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
  }

  if (checkEmail) {
    return (
      <div className="rounded-[var(--radius-tile)] border border-border bg-surface p-5 text-center">
        <p className="text-fg">Check your email to confirm your account.</p>
        <p className="mt-1 text-sm text-muted">We sent a link to {email}.</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-fg">
        {isCoach ? "List your coaching profile" : "Create your account"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {isCoach
          ? "Sign up to build your profile — you'll choose a plan next."
          : "Save favourite coaches and get notified about clinics near you."}
      </p>

      {!isSupabaseConfigured && (
        <p className="mt-4 rounded-[var(--radius-control)] border border-border bg-accent-soft p-3 text-sm text-fg">
          Auth isn&apos;t connected yet — this form is a preview until Supabase is set up.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg"
            required
          />
        </label>
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
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg"
            required
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Creating account…" : isCoach ? "Continue to plan selection" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent">
          Log in
        </Link>
      </p>
    </>
  );
}

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  );
}
