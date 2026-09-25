import type { createServiceSupabase } from "@/lib/supabase/service";
import { canSend, ensureContact } from "@/lib/audience";
import { sendEmailWithId } from "@/lib/email";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import type { ContentKey } from "@/lib/cms/content-defaults";
import { profileCompleteness } from "@/lib/coach-stats";
import { hasVideo } from "@/lib/tiers";
import { absoluteUrl, CONTACT_EMAIL } from "@/lib/site-url";
import { getOnboardingCompletePct, getPlanCapabilities } from "@/lib/settings";

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
    const email = run.contacts?.email;
    const allowed = email ? await canSend(service, email, "factual") : { ok: false, why: "no email" };
    const vars = allowed.ok ? await def.vars(service, run) : null;
    if (!email || !allowed.ok || !vars) {
      await stop(run.id, !email ? "no email" : !allowed.ok ? `not emailable: ${allowed.why}` : "gone");
      continue;
    }
    const copy = (await getContent(stepKey(def.key, step.position))) as { subject: string; body: string };
    const all = { ...vars, stop_url: absoluteUrl(`/email-preferences/sequence?t=${run.stop_token}`) };
    const sent = await sendEmailWithId({
      to: email,
      subject: fillVariables(copy.subject, all),
      text: `${fillVariables(copy.body, all)}\n\n--\n${fillVariables(footer.body, all)}`,
      // Scheduled bulk email: silent until CRON_EMAILS_ENABLED is on, so the
      // test deployment can run the whole sequence without mailing anyone.
      campaign: true,
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
