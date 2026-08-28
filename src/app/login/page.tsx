"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";

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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-fg">Log in</h1>

      {!isSupabaseConfigured && (
        <p className="mt-4 rounded-md border border-border bg-accent-soft p-3 text-sm text-fg">
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
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
            required
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-accent">
          Create an account
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
