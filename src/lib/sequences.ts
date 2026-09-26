import type { createServiceSupabase } from "@/lib/supabase/service";
import { canSend, consentStatus, ensureContact, recordConsent, type Purpose } from "@/lib/audience";
import { sendEmailWithId } from "@/lib/email";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import type { ContentKey } from "@/lib/cms/content-defaults";
import { profileCompleteness } from "@/lib/coach-stats";
import { hasVideo } from "@/lib/tiers";
import { absoluteUrl, CONTACT_EMAIL, publicUrl } from "@/lib/site-url";
import { addMonths, countWord, formatLongDate, getFoundingPrice, getOnboardingCompletePct, getPauseMaxMonths, getPlanCapabilities, getPlans, getQuietRiderDays } from "@/lib/settings";

/**
 * Sequences (The Marketing Engine M7): emails that go out over days after
 * something happens, and stop when the job's done. What starts and stops each
 * one is code, here; the words (one content block per step), the delays and
 * the on/off switches are on Admin → Sequences.
 *
 * Each sequence starts once per person (or profile), only for things that
 * happened in the last LOOKBACK_DAYS, so switching one on never mails
 * everyone who ever signed up. All four are factual emails about the
 * person's own account; each ends with a one-click stop link.
 */
type Service = NonNullable<ReturnType<typeof createServiceSupabase>>;
const HOUR = 3_600_000;
const LOOKBACK_DAYS = 14;
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Candidate = { subjectId: string; email: string; at: Date };
type Run = { id: string; sequence_key: string; subject_id: string; step_reached: number; started_at: string; stop_token: string };

export type SequenceDef = {
  key: string;
  name: string;
  to: string;
  starts: string;
  stops: string;
  /** Default hours after the previous step (or the trigger); admin can change them. */
  delays: number[];
  candidates: (service: Service, since: Date) => Promise<Candidate[]>;
  /** A reason to stop before the next step, or null to carry on. */
  exit: (service: Service, run: Run) => Promise<string | null>;
  vars: (service: Service, run: Run) => Promise<Record<string, string> | null>;
  /** A commercial sequence: only to people who agreed to this purpose, with the unsubscribe footer. Unset: factual. */
  purpose?: Purpose;
  /** Steps that do something instead of sending an email; the return value is why the run ends. */
  actions?: Record<number, (service: Service, run: Run) => Promise<string>>;
  /** Leave off the one-click stop line (where stopping would do the opposite of what the reader wants). */
  noFooter?: boolean;
};

// ── helpers ──────────────────────────────────────────────────────────────

async function ownerEmail(service: Service, providerId: string): Promise<string | null> {
  const { data } = await service.from("provider_members").select("role, profiles(email)").eq("provider_id", providerId);
  const rows = (data ?? []) as unknown as { role: string; profiles: { email: string | null } | null }[];
  return (rows.find((r) => r.role === "owner") ?? rows[0])?.profiles?.email ?? null;
}

async function providerBasics(service: Service, providerId: string) {
  const { data: p } = await service
    .from("providers")
    .select("id, name, slug, bio, lat, video_url, status, published_at, provider_terms(sort_order, terms(id, kind)), subscriptions(tier, status)")
    .eq("id", providerId)
    .maybeSingle();
  if (!p) return null;
  const professions = await getProfessions();
  const terms = ((p as unknown as { provider_terms: { sort_order: number; terms: { id: string; kind: string } | null }[] }).provider_terms ?? [])
    .filter((t) => t.terms)
    .sort((a, b) => a.sort_order - b.sort_order);
  const professionId = terms.find((t) => t.terms!.kind === "profession")?.terms!.id;
  const profession = professions.find((x) => x.id === professionId) ?? professions.find((x) => x.slug === "coaches")!;
  return { p, terms, profession, firstName: String(p.name).split(" ")[0] || "there" };
}

async function completeness(service: Service, providerId: string) {
  const b = await providerBasics(service, providerId);
  if (!b) return null;
  const [{ count: photos }, { count: testimonials }, caps] = await Promise.all([
    service.from("provider_photos").select("id", { count: "exact", head: true }).eq("provider_id", providerId),
    service.from("testimonials").select("id", { count: "exact", head: true }).eq("provider_id", providerId),
    getPlanCapabilities(),
  ]);
  const sub = (b.p as unknown as { subscriptions: { tier: string | null; status: string } | { tier: string | null; status: string }[] | null }).subscriptions;
  const plan = Array.isArray(sub) ? sub[0] : sub;
  return {
    ...b,
    score: profileCompleteness(
      {
        hasPhoto: (photos ?? 0) > 0,
        bio: String(b.p.bio ?? ""),
        termCount: b.terms.filter((t) => t.terms!.kind === "discipline").length,
        hasLocation: b.p.lat != null,
        testimonialCount: testimonials ?? 0,
        hasVideo: Boolean(b.p.video_url),
        videoAllowed: hasVideo(plan?.tier, plan?.status, caps),
      },
      b.profession.completeness
    ),
  };
}

// ── the sequences ────────────────────────────────────────────────────────

export const SEQUENCES: SequenceDef[] = [
  {
    key: "unfinished_signup",
    name: "Unfinished sign-up",
    to: "Professionals",
    starts: "A day after sign-up, when the profile still hasn't been sent in",
    stops: "They send the profile in, or after three emails",
    delays: [24, 72, 96],
    async candidates(service, since) {
      const { data } = await service.from("providers").select("id, created_at").eq("status", "draft").gte("created_at", since.toISOString());
      const out: Candidate[] = [];
      for (const p of data ?? []) {
        const email = await ownerEmail(service, p.id as string);
        if (email) out.push({ subjectId: p.id as string, email, at: new Date(p.created_at as string) });
      }
      return out;
    },
    async exit(service, run) {
      const { data } = await service.from("providers").select("status").eq("id", run.subject_id).maybeSingle();
      return !data ? "profile gone" : data.status === "draft" ? null : "sent in";
    },
    async vars(service, run) {
      const b = await providerBasics(service, run.subject_id);
      if (!b) return null;
      return { first_name: b.firstName, audience_plural: `${b.profession.audienceNoun}s`, onboarding_url: absoluteUrl("/onboarding"), contact_email: CONTACT_EMAIL };
    },
  },
  {
    key: "onboarding",
    name: "New profile",
    to: "Professionals",
    starts: "Their profile goes live",
    stops: "The profile is complete enough (Settings), or after four emails",
    delays: [48, 72, 120, 96],
    async candidates(service, since) {
      const { data } = await service.from("providers").select("id, published_at").eq("status", "published").gte("published_at", since.toISOString());
      const out: Candidate[] = [];
      for (const p of data ?? []) {
        const email = await ownerEmail(service, p.id as string);
        if (email) out.push({ subjectId: p.id as string, email, at: new Date(p.published_at as string) });
      }
      return out;
    },
    async exit(service, run) {
      const c = await completeness(service, run.subject_id);
      if (!c || c.p.status !== "published") return "not live";
      return c.score.pct >= (await getOnboardingCompletePct()) ? "profile complete" : null;
    },
    async vars(service, run) {
      const c = await completeness(service, run.subject_id);
      if (!c) return null;
      const since = (c.p.published_at as string | null) ?? run.started_at;
      const [{ count: views }, { count: reveals }, { count: enquiries }] = await Promise.all([
        service.from("provider_events").select("id", { count: "exact", head: true }).eq("provider_id", run.subject_id).eq("kind", "view").gte("created_at", since),
        service.from("provider_events").select("id", { count: "exact", head: true }).eq("provider_id", run.subject_id).eq("kind", "reveal").gte("created_at", since),
        service.from("enquiries").select("id", { count: "exact", head: true }).eq("provider_id", run.subject_id).gte("created_at", since),
      ]);
      return {
        first_name: c.firstName,
        audience_plural: `${c.profession.audienceNoun}s`,
        pct: String(c.score.pct),
        next_item: c.score.next?.label.toLowerCase() ?? "nothing left: it's complete",
        profile_edit_url: absoluteUrl(c.score.next?.href ?? "/dashboard/profile"),
        promote_url: absoluteUrl("/dashboard/promote"),
        reviews_url: absoluteUrl("/dashboard/reviews"),
        dashboard_url: absoluteUrl("/dashboard"),
        views: count(views ?? 0, "profile view", "profile views"),
        reveals: count(reveals ?? 0, "tap to call", "taps to call"),
        enquiries: count(enquiries ?? 0, "enquiry", "enquiries"),
      };
    },
  },
  {
    key: "first_win",
    name: "First enquiry",
    to: "Professionals",
    starts: "Their first enquiry, or the first time someone taps to see their number",
    stops: "After one email",
    delays: [0],
    async candidates(service, since) {
      const [{ data: enq }, { data: rev }] = await Promise.all([
        service.from("enquiries").select("provider_id, created_at").gte("created_at", since.toISOString()).order("created_at"),
        service.from("provider_events").select("provider_id, created_at").eq("kind", "reveal").gte("created_at", since.toISOString()).order("created_at"),
      ]);
      const first = new Map<string, Date>();
      for (const r of [...(enq ?? []), ...(rev ?? [])]) {
        const d = new Date(r.created_at as string);
        const cur = first.get(r.provider_id as string);
        if (!cur || d < cur) first.set(r.provider_id as string, d);
      }
      const out: Candidate[] = [];
      for (const [id, at] of first) {
        // Only a genuine first: nothing before the lookback window either.
        const [{ count: olderEnq }, { count: olderRev }, { data: p }] = await Promise.all([
          service.from("enquiries").select("id", { count: "exact", head: true }).eq("provider_id", id).lt("created_at", since.toISOString()),
          service.from("provider_events").select("id", { count: "exact", head: true }).eq("provider_id", id).eq("kind", "reveal").lt("created_at", since.toISOString()),
          service.from("providers").select("status").eq("id", id).maybeSingle(),
        ]);
        if ((olderEnq ?? 0) + (olderRev ?? 0) > 0 || p?.status !== "published") continue;
        const email = await ownerEmail(service, id);
        if (email) out.push({ subjectId: id, email, at });
      }
      return out;
    },
    async exit() {
      return null;
    },
    async vars(service, run) {
      const b = await providerBasics(service, run.subject_id);
      if (!b) return null;
      const { count: enq } = await service.from("enquiries").select("id", { count: "exact", head: true }).eq("provider_id", run.subject_id);
      return {
        first_name: b.firstName,
        what_happened: (enq ?? 0) > 0 ? "Someone sent you an enquiry" : "Someone tapped to see your phone number",
        enquiries_url: absoluteUrl("/dashboard/enquiries"),
      };
    },
  },
  {
    key: "rider_welcome",
    name: "Rider welcome",
    to: "Riders and horse owners",
    starts: "They make an account",
    stops: "They set up an alert, or after three emails",
    delays: [0, 72, 96],
    async candidates(service, since) {
      const { data } = await service.from("profiles").select("id, email, created_at").eq("role", "rider").gte("created_at", since.toISOString());
      return (data ?? []).filter((p) => p.email).map((p) => ({ subjectId: p.id as string, email: p.email as string, at: new Date(p.created_at as string) }));
    },
    async exit(service, run) {
      const { count } = await service.from("rider_alerts").select("id", { count: "exact", head: true }).eq("rider_id", run.subject_id).is("unsubscribed_at", null);
      return (count ?? 0) > 0 ? "has an alert" : null;
    },
    async vars(service, run) {
      const { data: p } = await service.from("profiles").select("name").eq("id", run.subject_id).maybeSingle();
      if (!p) return null;
      return { first_name: String(p.name ?? "").trim().split(/\s+/)[0] || "there", account_url: absoluteUrl("/account"), alerts_url: absoluteUrl("/account#alerts") };
    },
  },
];

// ── Stage E: keeping them ────────────────────────────────────────────────

async function subscriptionOf(service: Service, providerId: string) {
  const { data } = await service
    .from("subscriptions")
    .select("id, tier, status, founding, billing_interval, trial_ends_at, created_at, canceled_at, plan_changed_at")
    .eq("provider_id", providerId)
    .maybeSingle();
  return data;
}

const money = (s: string) => Number(String(s).replace(/[^0-9.]/g, "")) || 0;

async function billingVars(service: Service, providerId: string, since: string | null) {
  const b = await providerBasics(service, providerId);
  if (!b) return null;
  const [plans, foundingPrice, pauseMax, sub] = await Promise.all([getPlans(), getFoundingPrice(), getPauseMaxMonths(), subscriptionOf(service, providerId)]);
  const from = since ?? (sub?.created_at as string | undefined) ?? new Date(0).toISOString();
  const [{ count: views }, { count: reveals }, { count: enquiries }] = await Promise.all([
    service.from("provider_events").select("id", { count: "exact", head: true }).eq("provider_id", providerId).eq("kind", "view").gte("created_at", from),
    service.from("provider_events").select("id", { count: "exact", head: true }).eq("provider_id", providerId).eq("kind", "reveal").gte("created_at", from),
    service.from("enquiries").select("id", { count: "exact", head: true }).eq("provider_id", providerId).gte("created_at", from),
  ]);
  const tier = (sub?.tier as keyof typeof plans | null) ?? "listed";
  const plan = plans[tier] ?? plans.listed;
  const saving = Math.max(0, money(plan.monthly) * 12 - money(plan.yearly));
  return {
    first_name: b.firstName,
    billing_url: absoluteUrl("/dashboard/billing"),
    leaving_url: absoluteUrl("/dashboard/billing/cancel"),
    first_charge_date: sub?.trial_ends_at ? formatLongDate(new Date(sub.trial_ends_at as string)) : "",
    listed: plans.listed.name,
    spotlight: plans.spotlight.name,
    founding_price: foundingPrice,
    listed_price: plans.listed.monthly,
    spotlight_price: plans.spotlight.monthly,
    listed_tagline: plans.listed.tagline,
    spotlight_tagline: plans.spotlight.tagline,
    pause_months: countWord(pauseMax),
    views: count(views ?? 0, "profile view", "profile views"),
    reveals: count(reveals ?? 0, "tap to call", "taps to call"),
    enquiries: count(enquiries ?? 0, "enquiry", "enquiries"),
    plan: plan.name,
    monthly: plan.monthly,
    yearly: plan.yearly,
    saving: `$${saving.toFixed(2).replace(/\.00$/, "")}`,
  };
}

async function subscriptionCandidates(service: Service, rows: { provider_id: string; at: Date }[], since: Date): Promise<Candidate[]> {
  const out: Candidate[] = [];
  const now = new Date();
  for (const r of rows) {
    // Only once the trigger has come, and not long ago (the lookback).
    if (r.at < since || r.at > now) continue;
    const email = await ownerEmail(service, r.provider_id);
    if (email) out.push({ subjectId: r.provider_id, email, at: r.at });
  }
  return out;
}

SEQUENCES.push(
  {
    key: "founding_conversion",
    name: "Founding free period ending",
    to: "Founding members who agreed to news for professionals",
    starts: "60 days before their free period ends",
    stops: "They choose a plan, pause or cancel, or the free period ends. The 30, 14 and 3 day reminders go regardless",
    delays: [0, 480, 432],
    purpose: "provider_news",
    async candidates(service, since) {
      const { data } = await service.from("subscriptions").select("provider_id, trial_ends_at").eq("founding", true).eq("status", "trialing").not("trial_ends_at", "is", null);
      return subscriptionCandidates(service, (data ?? []).map((s) => ({ provider_id: s.provider_id as string, at: new Date(new Date(s.trial_ends_at as string).getTime() - 60 * 86_400_000) })), since);
    },
    async exit(service, run) {
      const s = await subscriptionOf(service, run.subject_id);
      if (!s) return "no plan";
      if (s.status === "canceled" || s.status === "paused") return String(s.status);
      if (s.status !== "trialing") return "free period over";
      if (s.plan_changed_at && new Date(s.plan_changed_at as string) > new Date(run.started_at)) return "chose a plan";
      return null;
    },
    async vars(service, run) {
      const s = await subscriptionOf(service, run.subject_id);
      return billingVars(service, run.subject_id, (s?.created_at as string | undefined) ?? null);
    },
  },
  {
    key: "annual_offer",
    name: "Pay yearly",
    to: "Monthly professionals who agreed to news for professionals",
    starts: "The start of their third paid month (not the founding rate, which is monthly)",
    stops: "They switch to yearly or stop paying, or after two emails",
    delays: [0, 336],
    purpose: "provider_news",
    async candidates(service, since) {
      const { data } = await service.from("subscriptions").select("provider_id, created_at, billing_interval").eq("status", "active").eq("founding", false).not("tier", "is", null);
      return subscriptionCandidates(
        service,
        (data ?? []).filter((s) => s.billing_interval !== "year").map((s) => ({ provider_id: s.provider_id as string, at: addMonths(new Date(s.created_at as string), 2) })),
        since
      );
    },
    async exit(service, run) {
      const s = await subscriptionOf(service, run.subject_id);
      if (!s || s.status !== "active") return "not paying";
      return s.billing_interval === "year" ? "switched to yearly" : null;
    },
    async vars(service, run) {
      return billingVars(service, run.subject_id, null);
    },
  },
  {
    key: "win_back",
    name: "Come back",
    to: "Professionals who cancelled and agreed to news for professionals",
    starts: "Their plan ends",
    stops: "They come back or stop news emails, or after three emails",
    delays: [720, 720, 720],
    purpose: "provider_news",
    async candidates(service, since) {
      const { data } = await service.from("subscriptions").select("provider_id, canceled_at").eq("status", "canceled").not("canceled_at", "is", null);
      return subscriptionCandidates(service, (data ?? []).map((s) => ({ provider_id: s.provider_id as string, at: new Date(s.canceled_at as string) })), since);
    },
    async exit(service, run) {
      const s = await subscriptionOf(service, run.subject_id);
      return s && s.status !== "canceled" ? "came back" : null;
    },
    async vars(service, run) {
      return billingVars(service, run.subject_id, null);
    },
  },
  {
    key: "quiet_rider",
    name: "Quiet rider check",
    to: "Riders we still email",
    starts: "No sign-in, click, alert change, save or enquiry for the quiet_rider_days setting",
    stops: "They press the button, or anything else shows they're around. Otherwise the second step stops their alerts and round-up",
    delays: [0, 336],
    noFooter: true,
    actions: {
      2: async (service, run) => {
        const { data: c } = await service.from("contacts").select("id").eq("profile_id", run.subject_id).maybeSingle();
        if (c) {
          const status = await consentStatus(service, c.id as string);
          for (const purpose of ["rider_alerts", "rider_news"] as const) {
            if (status[purpose]) await recordConsent(service, { contactId: c.id as string, purpose, action: "withdraw", method: "quiet check", source: "quiet rider check" });
          }
        }
        await service.from("rider_alerts").update({ unsubscribed_at: new Date().toISOString() }).eq("rider_id", run.subject_id).is("unsubscribed_at", null);
        return "no longer emailed";
      },
    },
    async candidates(service) {
      const days = await getQuietRiderDays();
      const { data } = await service.rpc("quiet_riders", { p_days: days });
      return ((data ?? []) as { profile_id: string; email: string; last_active: string }[]).map((r) => ({
        subjectId: r.profile_id,
        email: r.email,
        at: new Date(new Date(r.last_active).getTime() + days * 86_400_000),
      }));
    },
    async exit(service, run) {
      const { data } = await service.rpc("quiet_riders", { p_days: await getQuietRiderDays() });
      return ((data ?? []) as { profile_id: string }[]).some((r) => r.profile_id === run.subject_id) ? null : "active again";
    },
    async vars(service, run) {
      const { data: p } = await service.from("profiles").select("name").eq("id", run.subject_id).maybeSingle();
      const { data: step } = await service.from("sequence_steps").select("delay_hours").eq("sequence_key", "quiet_rider").eq("position", 2).maybeSingle();
      const stop = new Date(Date.now() + ((step?.delay_hours as number | undefined) ?? 336) * HOUR);
      return {
        first_name: String(p?.name ?? "").trim().split(/\s+/)[0] || "there",
        keep_url: publicUrl(`/email-preferences/keep?t=${run.stop_token}`),
        stop_date: stop.toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "Australia/Melbourne" }),
      };
    },
  }
);

export const stepKey = (sequence: string, position: number) => `email.seq.${sequence}.${position}` as ContentKey;

/** Rows for every sequence and step, off until someone switches them on. Safe to run any time. */
export async function ensureSequences(service: Service) {
  await service.from("sequences").upsert(SEQUENCES.map((s) => ({ key: s.key, active: false })), { onConflict: "key", ignoreDuplicates: true });
  await service
    .from("sequence_steps")
    .upsert(SEQUENCES.flatMap((s) => s.delays.map((d, i) => ({ sequence_key: s.key, position: i + 1, delay_hours: d }))), { onConflict: "sequence_key,position", ignoreDuplicates: true });
}

type StepRow = { sequence_key: string; position: number; delay_hours: number; active: boolean };

/** The next step to send after `after`, and when, counting the hours of any switched-off steps in between. */
function nextStep(steps: StepRow[], after: number, from: Date): { position: number; at: Date } | null {
  let hours = 0;
  for (const s of steps.filter((x) => x.position > after).sort((a, b) => a.position - b.position)) {
    hours += s.delay_hours;
    if (s.active) return { position: s.position, at: new Date(from.getTime() + hours * HOUR) };
  }
  return null;
}

/**
 * The cron (/api/cron/sequences): start runs for anything new, then send
 * every step that's due, checking each sequence's stop rule first and the
 * do-not-email list for every send. Safe to run as often as you like.
 */
export async function runSequences(service: Service, now = new Date()) {
  await ensureSequences(service);
  const [{ data: seqRows }, { data: stepRows }] = await Promise.all([
    service.from("sequences").select("key, active"),
    service.from("sequence_steps").select("sequence_key, position, delay_hours, active"),
  ]);
  const active = new Set((seqRows ?? []).filter((s) => s.active).map((s) => s.key as string));
  const stepsOf = (key: string) => ((stepRows ?? []) as StepRow[]).filter((s) => s.sequence_key === key);
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
  const tally = { started: 0, sent: 0, stopped: 0 };

  for (const def of SEQUENCES.filter((d) => active.has(d.key))) {
    const { data: existing } = await service.from("sequence_runs").select("subject_id").eq("sequence_key", def.key);
    const have = new Set((existing ?? []).map((r) => r.subject_id as string));
    for (const c of await def.candidates(service, since)) {
      if (have.has(c.subjectId)) continue;
      const first = nextStep(stepsOf(def.key), 0, c.at);
      if (!first) continue;
      const contact = await ensureContact(service, c.email);
      const { error } = await service.from("sequence_runs").insert({ sequence_key: def.key, subject_id: c.subjectId, contact_id: contact.id, next_at: first.at.toISOString(), started_at: c.at.toISOString() });
      if (!error) tally.started++;
    }
  }

  const { data: due } = await service
    .from("sequence_runs")
    .select("id, sequence_key, subject_id, step_reached, started_at, stop_token, contacts(email)")
    .is("stopped_at", null)
    .lte("next_at", now.toISOString())
    .limit(500);
  const footer = await getContent("email.sequence_footer");
  const stop = async (id: string, reason: string) => {
    await service.from("sequence_runs").update({ stopped_at: now.toISOString(), stop_reason: reason, next_at: null }).eq("id", id);
    tally.stopped++;
  };
  for (const run of (due ?? []) as unknown as (Run & { contacts: { email: string } | null })[]) {
    const def = SEQUENCES.find((d) => d.key === run.sequence_key);
    // A sequence switched off leaves its runs waiting, to carry on if it's switched back on.
    if (!def || !active.has(def.key)) continue;
    const step = nextStep(stepsOf(def.key), run.step_reached, new Date(0));
    if (!step) {
      await stop(run.id, "finished");
      continue;
    }
    const reason = await def.exit(service, run);
    if (reason) {
      await stop(run.id, reason);
      continue;
    }
    const action = def.actions?.[step.position];
    if (action) {
      const why = await action(service, run);
      await service.from("sequence_sends").insert({ run_id: run.id, position: step.position, result: "action" });
      await service.from("sequence_runs").update({ step_reached: step.position, next_at: null, stopped_at: now.toISOString(), stop_reason: why }).eq("id", run.id);
      tally.stopped++;
      continue;
    }
    const email = run.contacts?.email;
    const allowed = email ? await canSend(service, email, def.purpose ?? "factual") : { ok: false, why: "no email" };
    const vars = allowed.ok ? await def.vars(service, run) : null;
    if (!email || !allowed.ok || !vars) {
      await stop(run.id, !email ? "no email" : !allowed.ok ? `not emailable: ${allowed.why}` : "gone");
      continue;
    }
    const copy = (await getContent(stepKey(def.key, step.position))) as { subject: string; body: string };
    const all = { ...vars, stop_url: publicUrl(`/email-preferences/sequence?t=${run.stop_token}`) };
    const sent = await sendEmailWithId({
      to: email,
      subject: fillVariables(copy.subject, all),
      text: def.noFooter ? fillVariables(copy.body, all) : `${fillVariables(copy.body, all)}\n\n--\n${fillVariables(footer.body, all)}`,
      // Scheduled bulk email: silent until CRON_EMAILS_ENABLED is on, so the
      // test deployment can run the whole sequence without mailing anyone.
      campaign: true,
      ...(def.purpose && allowed.token ? { commercial: { token: allowed.token, purpose: def.purpose } } : {}),
    });
    await service.from("sequence_sends").insert({ run_id: run.id, position: step.position, result: sent.result, resend_id: sent.id });
    tally.sent++;
    const after = nextStep(stepsOf(def.key), step.position, now);
    await service
      .from("sequence_runs")
      .update(after ? { step_reached: step.position, next_at: after.at.toISOString() } : { step_reached: step.position, next_at: null, stopped_at: now.toISOString(), stop_reason: "finished" })
      .eq("id", run.id);
  }
  return tally;
}
