"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { AuthShell } from "@/components/auth-shell";
import { inputClass, labelClass } from "@/components/ui/field";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ResendLink } from "@/components/resend-link";
import { friendlyAuthError } from "@/lib/friendly-error";
import { confirmRedirect, safeNextPath } from "@/lib/site-url";

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
 *
 * The confirmation link goes to /auth/confirm, which works whichever browser
 * opens it (a coach who signs up in Messenger's browser and opens the email
 * in Gmail's). Two screens follow a send: "check your email", with a resend
 * button and a way back to fix the address, and "you already have an
 * account", because with confirmation on Supabase answers a sign-up for a
 * registered address with success and sends nothing.
 */
export function SignupForm({
  professional,
  professions,
  defaultProfession,
  plan,
  source,
  invite,
  touch,
  news,
  codes = { referral: "", promo: "" },
  supportPhone = "",
}: {
  /** The support_phone setting, for the catch-all error. */
  supportPhone?: string;
  /** Codes from the link they came in on, checked by the sign-up trigger. */
  codes?: { referral: string; promo: string };
  /** Where they came from, as JSON strings for the sign-up trigger (or "null"). */
  touch: { first: string; last: string };
  /** The provider_news consent wording, shown beside an unticked box. */
  news: { id: string; body: string } | null;
  professional: boolean;
  professions: ProfessionOption[];
  defaultProfession: string;
  plan: string;
  source: string;
  invite: SignupInvite | null;
}) {
  const [profession, setProfession] = useState(defaultProfession);
  const [changing, setChanging] = useState(false);
  const [name, setName] = useState(invite?.usable ? invite.name : "");
  const [email, setEmail] = useState(invite?.usable ? invite.email : "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<"form" | "check" | "exists">("form");
  const [wantsNews, setWantsNews] = useState(false);
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
    const next = nextPath();

    // A thrown exception (network, bad URL/key) rather than a returned
    // { error } would otherwise skip setLoading(false) and leave the form stuck.
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: professional
            ? {
                role: "provider",
                name,
                profession,
                plan,
                source,
                invite: invite?.usable ? invite.token : "",
                touch_first: touch.first,
                touch_last: touch.last,
                referral: codes.referral,
                promo: codes.promo,
                // Marketing consent is its own box, unticked (Spam Act): the id of the words they saw.
                news_wording: wantsNews && news ? news.id : "",
              }
            : { role: "rider", name, touch_first: touch.first, touch_last: touch.last },
          emailRedirectTo: confirmRedirect(window.location.origin, next),
        },
      });
      if (signUpError) {
        setError(friendlyAuthError(signUpError, supportPhone));
        return;
      }
      // With confirmation on, an address that already has an account comes
      // back as a success with no identities, and no email is sent.
      if (data.user && !data.session && (data.user.identities?.length ?? 0) === 0) {
        setScreen("exists");
        return;
      }
      // Email confirmation is on: no session until they click the link.
      if (data.user && !data.session) {
        setScreen("check");
        return;
      }
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

  function nextPath() {
    return safeNextPath(professional ? `/onboarding${plan ? `?plan=${encodeURIComponent(plan)}` : ""}` : "/account");
  }

  if (screen === "check") {
    return (
      <AuthShell
        eyebrow="One more step"
        title="Check your email"
        lead={
          <>
            We sent a link to <strong className="font-medium text-ink break-all">{email}</strong>. Open it to confirm your address
            {professional ? " and you'll go straight to setting up your profile." : " and you're in."}
          </>
        }
      >
        <p className="mb-4 text-[14px] leading-[1.5] text-muted">
          It&apos;s fine to open the email on your phone or in a different app from this one. Nothing after a minute? Check your spam folder, then send it again.
        </p>
        <ResendLink kind="signup" email={email} next={nextPath()} supportPhone={supportPhone} startWaiting />
        <p className="mt-4 text-center text-[14px] text-muted">
          Wrong address?{" "}
          <button type="button" onClick={() => setScreen("form")} className="font-medium text-accent">
            Start again
          </button>
        </p>
      </AuthShell>
    );
  }

  if (screen === "exists") {
    return (
      <AuthShell
        eyebrow="Already signed up"
        title="You already have an account with that email"
        lead={
          <>
            <strong className="font-medium text-ink break-all">{email}</strong> is already signed up. Log in with it, or set a new password if you can&apos;t remember yours.
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] bg-accent px-5 text-[15px] font-semibold text-accent-fg hover:bg-accent-hover">
            Log in
          </Link>
          <Link href="/forgot-password" className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] border border-ink px-5 text-[15px] font-medium text-ink hover:bg-shade">
            Reset your password
          </Link>
        </div>
        <p className="mt-4 text-center text-[14px] text-muted">
          Meant a different address?{" "}
          <button type="button" onClick={() => setScreen("form")} className="font-medium text-accent">
            Start again
          </button>
        </p>
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

        {professional && news && (
          <label className="flex gap-2.5 text-[14px] leading-[1.45] text-fg">
            <input type="checkbox" checked={wantsNews} onChange={(e) => setWantsNews(e.target.checked)} className="mt-0.5 accent-accent" />
            <span>{news.body}</span>
          </label>
        )}

        {error && (
          <p role="alert" className="text-[13.5px] text-accent">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="mt-1 h-12 w-full text-[15px]">
          {loading ? "Making your account…" : "Create account"}
        </Button>
        <p className="text-center text-[13px] leading-[1.5] text-subtle">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-fg">terms</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">privacy policy</Link>.
        </p>
      </form>
    </AuthShell>
  );
}
