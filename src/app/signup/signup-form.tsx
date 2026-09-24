"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { AuthShell } from "@/components/auth-shell";
import { inputClass, labelClass } from "@/components/ui/field";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type SignupInvite = { token: string; name: string; email: string; profession: string | null; usable: boolean };
type ProfessionOption = { slug: string; name: string; singular: string };

/**
 * The account step (§06.2): name, email, password, and the profession shown
 * with a "change" link rather than asked. Riders get the plain form.
 *
 * Everything the sign-up trigger needs goes in the auth metadata: role,
 * profession, the plan they came for, where they came from and the invite
 * token. Cohort is not sent: the trigger decides it from the founding
 * sign-up date, so a hand-made request can't claim it. Confirming the email
 * lands a professional in onboarding.
 */
export function SignupForm({
  professional,
  professions,
  defaultProfession,
  plan,
  source,
  invite,
}: {
  professional: boolean;
  professions: ProfessionOption[];
  defaultProfession: string;
  plan: string;
  source: string;
  invite: SignupInvite | null;
}) {
  const router = useRouter();
  const [profession, setProfession] = useState(defaultProfession);
  const [changing, setChanging] = useState(false);
  const [name, setName] = useState(invite?.usable ? invite.name : "");
  const [email, setEmail] = useState(invite?.usable ? invite.email : "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const picked = professions.find((p) => p.slug === profession) ?? professions[0];
  const article = /^[aeiou]/i.test(picked?.singular ?? "") ? "an" : "a";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Sign-up isn't connected yet.");
      return;
    }
    const next = professional ? `/onboarding${plan ? `?plan=${encodeURIComponent(plan)}` : ""}` : "/account";

    // A thrown exception (network, bad URL/key) rather than a returned
    // { error } would otherwise skip setLoading(false) and leave the form stuck.
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: professional
            ? { role: "provider", name, profession, plan, source, invite: invite?.usable ? invite.token : "" }
            : { role: "rider", name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      // Email confirmation is on: no session until they click the link.
      if (data.user && !data.session) {
        setCheckEmail(true);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong making your account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthShell
        eyebrow="One more step"
        title="Check your email"
        lead={
          <>
            We sent a link to <strong className="font-medium text-ink">{email}</strong>. Open it to confirm your address
            {professional ? " and you'll go straight to setting up your profile." : " and you're in."}
          </>
        }
      >
        <p className="text-[14px] leading-[1.5] text-muted">Nothing after a minute? Check your spam folder, or sign up again with the right address.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={professional ? "List your profile" : "For riders and horse owners · free"}
      title={
        professional ? (
          <>
            Join as {article} <em className="italic text-accent">{picked?.singular ?? "professional"}</em>
          </>
        ) : (
          "Create your account"
        )
      }
      lead={
        professional
          ? "Make your account, then set up your profile in five short steps. Each step saves as you go."
          : "Save the people you like and hear when something's on near you."
      }
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
          Sign-up isn&apos;t connected yet, so this form is only a preview.
        </p>
      )}
      {invite && !invite.usable && (
        <p className="mb-4 rounded-[12px] border border-border bg-shade px-3.5 py-3 text-[13.5px] leading-[1.5] text-muted">
          That invite link has been used or has expired. You can still sign up below.
        </p>
      )}

      {professional && professions.length > 1 && (
        <div className="mb-4 rounded-[12px] bg-shade px-3.5 py-3 text-[14px] text-fg">
          {changing ? (
            <label className="block">
              <span className={labelClass}>What you do</span>
              <select
                value={profession}
                onChange={(e) => {
                  setProfession(e.target.value);
                  setChanging(false);
                }}
                className={inputClass}
                autoFocus
              >
                {professions.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="flex items-baseline justify-between gap-3">
              <span>
                Signing up as {article} <strong className="font-medium">{picked?.singular}</strong>
              </span>
              <button type="button" onClick={() => setChanging(true)} className="text-[13.5px] font-medium text-accent">
                Change
              </button>
            </span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block">
          <span className={labelClass}>Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoComplete="name" required />
        </label>
        <label className="block">
          <span className={labelClass}>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" required />
        </label>
        <label className="block">
          <span className={labelClass}>Password</span>
          <PasswordInput value={password} onChange={setPassword} minLength={8} required />
        </label>

        {error && (
          <p role="alert" className="text-[13.5px] text-accent">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="mt-1 h-12 w-full text-[15px]">
          {loading ? "Making your account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
