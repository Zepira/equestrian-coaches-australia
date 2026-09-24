import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProvider, PROVIDER_PHOTOS } from "@/lib/supabase/queries";
import { getProfessions } from "@/lib/cms/read";
import { getSectionTerms } from "@/lib/sections";
import { formatLongDate, getFirstChargeDate, getFoundingPrice, getPlans, isReviewRequired } from "@/lib/settings";
import { chargeWording } from "@/lib/founding";
import { isComplete, profileChecklist } from "@/lib/provider-lifecycle";
import { isLiveStatus, TIERS } from "@/lib/tiers";
import { profilePath } from "@/lib/page-paths";
import { FALLBACK_PROFESSIONS } from "@/lib/professions";
import { PhotoUploadForm } from "@/app/dashboard/profile/photo-upload-form";
import { saveFoundingCard, startCheckoutFromOnboarding } from "@/app/dashboard/billing/actions";
import { AutosaveForm } from "./autosave-form";
import { WhatStep } from "./what-step";
import { saveContact, saveWhat, saveWhere, saveYou, submitProfile } from "./actions";

export const metadata: Metadata = { title: "Set up your profile", robots: { index: false, follow: false } };

const STEPS = ["what", "where", "you", "contact", "plan", "preview"] as const;
type Step = (typeof STEPS)[number];

const field = "mt-2 w-full rounded-[12px] border border-border bg-surface px-3.5 py-3 text-[15px] text-fg focus:border-accent focus:outline-none";
const label = "text-[15px] font-semibold text-fg";
const help = "mt-1 block text-[14px] leading-[1.45] text-muted";

/**
 * Onboarding (The Site as a CMS §06.3–4): five short steps and a preview,
 * one route, `?step=`. Every label that differs by profession (disciplines
 * or specialities, riders or horse owners, "years coaching" or "years in
 * practice") comes from the provider's profession row. Each step saves as it
 * goes; the preview checks the finished-profile minimum and submits.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; plan?: string; submitted?: string; incomplete?: string; card?: string }>;
}) {
  const sp = await searchParams;
  const step: Step = STEPS.includes(sp.step as Step) ? (sp.step as Step) : "what";
  const supabase = await createClient();
  if (!supabase) redirect("/");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");
  const provider = await getMyProvider(supabase, user.id);
  if (!provider) redirect("/dashboard");
  const providerId = provider.id;

  const [all, { data: termRows }, { data: photos }, { data: sub }, checklist, plans, foundingPrice, reviewRequired, firstCharge, charge] = await Promise.all([
    getProfessions(),
    supabase.from("provider_terms").select("sort_order, term_id, terms(slug, kind, parent_id)").eq("provider_id", providerId).order("sort_order"),
    supabase.from("provider_photos").select("id, storage_path").eq("provider_id", providerId).order("sort_order"),
    supabase.from("subscriptions").select("tier, status, founding").eq("provider_id", providerId).maybeSingle(),
    profileChecklist(supabase, providerId),
    getPlans(),
    getFoundingPrice(),
    isReviewRequired(),
    getFirstChargeDate(),
    chargeWording(),
  ]);
  const rows = (termRows ?? []).map((r) => ({ ...r, term: (r as unknown as { terms: { slug: string; kind: string; parent_id: string | null } | null }).terms }));
  const heldProfessions = rows.filter((r) => r.term?.kind === "profession").map((r) => r.term!.slug);
  const available = all.filter((p) => p.launchState !== "draft" || heldProfessions.includes(p.slug));
  const profession = available.find((p) => p.slug === heldProfessions[0]) ?? available[0] ?? FALLBACK_PROFESSIONS[0];
  const audience = `${profession.audienceNoun}s`;
  const status = String(provider.status);
  const founding = provider.cohort === "founding";
  const planLive = isLiveStatus(sub?.status);

  const nav: { step: Step; title: string; done: boolean }[] = [
    { step: "what", title: "What you do", done: checklist.speciality },
    { step: "where", title: "Where you work", done: checklist.location },
    { step: "you", title: "About you", done: checklist.photo && checklist.bio },
    { step: "contact", title: `How ${audience} reach you`, done: Boolean(provider.show_contact_form || provider.show_contact_phone || provider.show_contact_email) },
    { step: "plan", title: "Your plan", done: checklist.plan },
    { step: "preview", title: "Check and send", done: status !== "draft" && status !== "changes_requested" },
  ];
  const nextOf = (s: Step) => `/onboarding?step=${STEPS[STEPS.indexOf(s) + 1] ?? "preview"}`;

  return (
    <div className="mx-auto max-w-[1184px] px-[18px] pb-20 pt-8 wide:grid wide:grid-cols-[240px_1fr] wide:gap-14 wide:px-12 wide:pt-14">
      <nav aria-label="Set-up steps" className="mb-8 wide:mb-0">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent">Set up your profile</p>
        <ol className="mt-4 flex gap-2 overflow-x-auto wide:flex-col wide:gap-1">
          {nav.map((n, i) => (
            <li key={n.step} className="shrink-0">
              <Link
                href={`/onboarding?step=${n.step}`}
                aria-current={n.step === step ? "step" : undefined}
                className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14px] ${n.step === step ? "bg-shade font-semibold text-ink" : "text-muted hover:text-ink"}`}
              >
                <span aria-hidden className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${n.done ? "bg-accent text-accent-fg" : "border border-border"}`}>
                  {n.done ? "✓" : i + 1}
                </span>
                {n.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0 max-w-[680px]">
        {status === "changes_requested" && provider.review_note ? (
          <div className="mb-6 rounded-[14px] border border-accent/40 bg-accent-soft p-4 text-[15px] leading-[1.5] text-fg">
            <strong className="font-semibold">We asked for a couple of changes:</strong> {String(provider.review_note)}
          </div>
        ) : null}

        {step === "what" && (
          <>
            <h1 className="text-[40px] leading-none text-ink wide:text-[52px]">What do you do?</h1>
            <p className="mt-3 text-[16px] text-muted">Pick your main work. If you do something else as well, add it underneath.</p>
            <div className="mt-8">
              <AutosaveForm action={saveWhat} next={nextOf("what")}>
                <WhatStep
                  options={await Promise.all(
                    available.map(async (p) => ({
                      slug: p.slug,
                      name: p.name,
                      termNoun: p.termNoun,
                      termNounPlural: p.termNounPlural,
                      terms: (await getSectionTerms(p.id)).map((t) => ({ id: t.id, name: t.name })),
                    }))
                  )}
                  primary={profession.slug}
                  second={heldProfessions[1] ?? ""}
                  picked={rows.filter((r) => r.term?.kind === "discipline").map((r) => r.term_id as string)}
                />
              </AutosaveForm>
            </div>
          </>
        )}

        {step === "where" && (
          <>
            <h1 className="text-[40px] leading-none text-ink wide:text-[52px]">Where do you work?</h1>
            <div className="mt-8">
              <AutosaveForm action={saveWhere} next={nextOf("where")}>
                <label className="block">
                  <span className={label}>Where you&apos;re based</span>
                  <span className={help}>Suburb and state, or a postcode. Your profile shows the suburb, never a street address.</span>
                  <input name="place" defaultValue={[provider.suburb, provider.state, provider.postcode].filter(Boolean).join(" ")} className={field} autoComplete="off" />
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" name="travels" defaultChecked={Boolean(provider.travels_to_client)} className="accent-accent" />
                  <span className="text-[15px] text-fg">I travel to {audience}</span>
                </label>
                <label className="block">
                  <span className={label}>How far you&apos;ll travel, in km</span>
                  <span className={help}>People further away than this still find you if they search your area.</span>
                  <input name="travel_radius_km" inputMode="numeric" defaultValue={provider.travel_radius_km != null ? String(provider.travel_radius_km) : ""} className={`${field} max-w-[160px]`} />
                </label>
                {profession.remoteAllowed && (
                  <label className="flex items-center gap-3">
                    <input type="checkbox" name="remote" defaultChecked={Boolean(provider.remote)} className="accent-accent" />
                    <span className="text-[15px] text-fg">I also work online, so distance doesn&apos;t matter</span>
                  </label>
                )}
                <label className="block">
                  <span className={label}>Business name</span>
                  <span className={help}>Only if you trade under one.</span>
                  <input name="business_name" defaultValue={String(provider.business_name ?? "")} className={field} />
                </label>
              </AutosaveForm>
            </div>
          </>
        )}

        {step === "you" && (
          <>
            <h1 className="text-[40px] leading-none text-ink wide:text-[52px]">About you</h1>
            <div className="mt-8 rounded-[14px] border border-border bg-surface p-4">
              <p className={label}>Photo</p>
              <p className={help}>A clear photo of you at work.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {(photos ?? []).slice(0, 4).map((ph) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={ph.id} src={supabase.storage.from(PROVIDER_PHOTOS).getPublicUrl(ph.storage_path).data.publicUrl} alt="" className="h-20 w-16 rounded-t-[32px] rounded-b-[6px] object-cover" />
                ))}
                <PhotoUploadForm configured />
              </div>
            </div>
            <div className="mt-6">
              <AutosaveForm action={saveYou} next={nextOf("you")}>
                <label className="block">
                  <span className={label}>Your name</span>
                  <input name="name" defaultValue={provider.name} className={field} required />
                </label>
                <label className="block">
                  <span className={label}>One line about what you do</span>
                  <input name="headline" maxLength={120} defaultValue={String(provider.headline ?? "")} className={field} />
                </label>
                <label className="block">
                  <span className={label}>In your own words</span>
                  <span className={help}>A few sentences: who you work with, what you&apos;re good at, how you like to work.</span>
                  <textarea name="bio" rows={6} defaultValue={String(provider.bio ?? "")} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Qualifications, registration and insurance</span>
                  <span className={help}>One per line. Your profile shows them as supplied by you; we don&apos;t check them.</span>
                  <textarea name="qualifications" rows={4} defaultValue={((provider.qualifications as string[] | null) ?? []).join("\n")} className={field} />
                </label>
                <label className="block">
                  <span className={label}>{profession.yearsLabel.charAt(0).toUpperCase() + profession.yearsLabel.slice(1)}</span>
                  <input name="years_experience" inputMode="numeric" defaultValue={provider.years_experience != null ? String(provider.years_experience) : ""} className={`${field} max-w-[160px]`} />
                </label>
              </AutosaveForm>
            </div>
          </>
        )}

        {step === "contact" && (
          <>
            <h1 className="text-[40px] leading-none text-ink wide:text-[52px]">How {audience} reach you</h1>
            <p className="mt-3 text-[16px] text-muted">Switch on as many as you like. At least one, or nobody can get in touch.</p>
            <div className="mt-8">
              <AutosaveForm action={saveContact} next={nextOf("contact")}>
                <label className="flex items-start gap-3">
                  <input type="checkbox" name="show_contact_form" defaultChecked={provider.show_contact_form !== false} className="mt-1 accent-accent" />
                  <span>
                    <span className="text-[15px] text-fg">An enquiry form on my profile</span>
                    <span className={help}>Messages arrive by email and in your dashboard.</span>
                  </span>
                </label>
                <label className="block">
                  <span className={label}>Phone</span>
                  <input name="contact_phone" type="tel" defaultValue={String(provider.contact_phone ?? "")} className={field} />
                  <span className="mt-2 flex items-center gap-2 text-[14px] text-fg">
                    <input type="checkbox" name="show_contact_phone" defaultChecked={Boolean(provider.show_contact_phone)} className="accent-accent" />
                    Show it. People tap to see the number, so it isn&apos;t sitting on the page.
                  </span>
                </label>
                <label className="block">
                  <span className={label}>Email</span>
                  <input name="contact_email" type="email" defaultValue={String(provider.contact_email || user.email || "")} className={field} />
                  <span className="mt-2 flex items-center gap-2 text-[14px] text-fg">
                    <input type="checkbox" name="show_contact_email" defaultChecked={Boolean(provider.show_contact_email)} className="accent-accent" />
                    Show it on my profile
                  </span>
                </label>
              </AutosaveForm>
            </div>
          </>
        )}

        {step === "plan" && (
          <>
            <h1 className="text-[40px] leading-none text-ink wide:text-[52px]">Your plan</h1>
            {founding ? (
              <div className="mt-8 rounded-[16px] bg-ink p-6 text-ink-fg wide:p-8">
                <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-peach">Founding member</p>
                <p className="mt-3 text-[17px] leading-[1.5]">
                  You&apos;re one of our founding members, so you get {plans.spotlight.name} free until{" "}
                  {firstCharge ? formatLongDate(firstCharge) : "six months after we launch"}. After that it&apos;s{" "}
                  {plans.listed.name} at {foundingPrice} a month, and that price stays yours for as long as you stay.
                </p>
                {planLive ? (
                  <p className="mt-5 text-[15px] text-ink-fg/85">Your card is saved. {charge}</p>
                ) : (
                  <form action={saveFoundingCard} className="mt-5">
                    <p className="mb-4 text-[15px] text-ink-fg/85">We take your card now. {charge}</p>
                    <button type="submit" className="rounded-[var(--radius-pill)] bg-accent px-[26px] py-3 text-[15px] font-semibold text-accent-fg hover:bg-accent-hover">
                      Save my card
                    </button>
                  </form>
                )}
              </div>
            ) : planLive ? (
              <p className="mt-8 text-[16px] text-fg">
                You&apos;re on {sub?.tier ? plans[sub.tier as keyof typeof plans]?.name : "a plan"}. You can change it any time in Billing.
              </p>
            ) : (
              <div className="mt-8 flex flex-col gap-3">
                {TIERS.map((t) => (
                  <form key={t} action={startCheckoutFromOnboarding.bind(null, t)}>
                    <button
                      type="submit"
                      className={`flex w-full items-center justify-between gap-3 rounded-[14px] border bg-surface px-5 py-4 text-left transition-colors hover:border-accent ${sp.plan === t ? "border-accent" : "border-border"}`}
                    >
                      <span>
                        <span className="block font-display text-[22px] leading-none text-ink">{plans[t].name}</span>
                        <span className="mt-1 block text-[14px] text-muted">{plans[t].tagline}</span>
                      </span>
                      <span className="font-display text-[20px] text-ink">{plans[t].monthly}/mo</span>
                    </button>
                  </form>
                ))}
                <p className="text-[14px] text-muted">Change plan or cancel whenever you like.</p>
              </div>
            )}
            <div className="mt-8 border-t border-border pt-5">
              <Link href="/onboarding?step=preview" className="rounded-[var(--radius-pill)] bg-accent px-[26px] py-3 text-[15px] font-semibold text-accent-fg hover:bg-accent-hover">
                Continue
              </Link>
            </div>
          </>
        )}

        {step === "preview" && (
          <>
            <h1 className="text-[40px] leading-none text-ink wide:text-[52px]">Check and send</h1>
            {sp.submitted === "in_review" || status === "in_review" ? (
              <p className="mt-6 rounded-[14px] bg-shade p-5 text-[16px] leading-[1.5] text-fg">
                Thanks. We&apos;ll have a look and let you know, usually within a day or two. You can keep editing in the meantime.
              </p>
            ) : sp.submitted === "published" || status === "published" ? (
              <p className="mt-6 rounded-[14px] bg-shade p-5 text-[16px] leading-[1.5] text-fg">
                Your profile is live.{" "}
                <Link href={profilePath(provider.slug)} className="font-medium text-accent">
                  See it
                </Link>
                , or head to your{" "}
                <Link href="/dashboard" className="font-medium text-accent">
                  dashboard
                </Link>
                .
              </p>
            ) : (
              <>
                <p className="mt-3 text-[16px] text-muted">
                  Everything below needs a tick before your profile can go {reviewRequired ? "to us for a quick look" : "live"}.
                </p>
                <ul className="mt-6 flex flex-col gap-2">
                  {(
                    [
                      [checklist.photo, "A photo", "you"],
                      [checklist.bio, "A few lines about you", "you"],
                      [checklist.speciality, `At least one ${profession.termNoun}`, "what"],
                      [checklist.location, "Where you're based", "where"],
                      [checklist.plan, founding ? "Your card saved" : "A plan", "plan"],
                    ] as const
                  ).map(([ok, text, s]) => (
                    <li key={text} className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 text-[15px]">
                      <span className="flex items-center gap-3">
                        <span aria-hidden className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${ok ? "bg-accent text-accent-fg" : "border border-border"}`}>
                          {ok ? "✓" : ""}
                        </span>
                        {text}
                      </span>
                      {!ok && (
                        <Link href={`/onboarding?step=${s}`} className="text-[14px] font-medium text-accent">
                          Add it
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
                {sp.incomplete && <p className="mt-4 text-[14px] text-accent">A couple of things still need doing first.</p>}
                <div className="mt-8 flex flex-wrap items-center gap-5 border-t border-border pt-5">
                  <form action={submitProfile}>
                    <button
                      type="submit"
                      disabled={!isComplete(checklist)}
                      className="rounded-[var(--radius-pill)] bg-accent px-[26px] py-3 text-[15px] font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
                    >
                      {reviewRequired ? "Send for review" : "Publish my profile"}
                    </button>
                  </form>
                  <Link href={`${profilePath(provider.slug)}?preview=1`} target="_blank" className="border-b border-current text-[15px] font-medium text-accent">
                    See it as {audience} will
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
