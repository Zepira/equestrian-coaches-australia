import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createServiceSupabase } from "@/lib/supabase/service";
import { getContent, getProfessions, fillVariables } from "@/lib/cms/read";
import { sendEmail } from "@/lib/email";
import { unsubscribeLinks } from "@/lib/rider-email";

/**
 * The coming soon page's waitlist (supabase/migrations/0010_waitlist.sql).
 *
 * The table has no insert policy for anyone, so every write comes through
 * here under the service role. That makes this file the only place the rules
 * live: consent is required, the honeypot has to be empty, and one address
 * can only ever be on the list once.
 */

export type WaitlistRole = "rider" | "coach" | "horse_care";
const ROLES: WaitlistRole[] = ["rider", "coach", "horse_care"];
export const isWaitlistRole = (v: string): v is WaitlistRole => (ROLES as string[]).includes(v);

/** Sign-ups allowed from one address per hour before we stop answering. */
const PER_HOUR = 5;

/**
 * A salted, daily-rotating hash of the caller's IP, the same approach
 * src/lib/coach-events.ts uses to count a visitor once. The user agent is
 * left out on purpose: including it would let one script get a fresh rate
 * limit by changing a header.
 */
async function ipHash(): Promise<string | null> {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
    const day = new Date().toISOString().slice(0, 10);
    const salt = process.env.COACH_EVENTS_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "epa";
    return createHash("sha256").update(`${ip}|${day}|${salt}`).digest("hex").slice(0, 32);
  } catch {
    return null;
  }
}

// Deliberately loose. An address that passes this and does not exist just
// bounces; a stricter pattern mostly rejects real addresses.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type JoinInput = {
  email: string;
  role: string;
  /** A horse care profession's slug, when they named one. */
  profession?: string;
  consent: boolean;
  /** The hidden field. A real person leaves it empty; a bot fills it in. */
  honeypot?: string;
};

export type JoinResult = { ok: true; already: boolean } | { ok: false; error: string };

export async function joinWaitlist(input: JoinInput): Promise<JoinResult> {
  // A filled honeypot is a bot. Answer as though it worked, so it has nothing
  // to learn from the difference.
  if (input.honeypot && input.honeypot.trim() !== "") return { ok: true, already: false };

  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: "That doesn't look like an email address." };
  if (!isWaitlistRole(input.role)) return { ok: false, error: "Let us know whether you ride or work with horses." };
  if (!input.consent) return { ok: false, error: "Tick the box to say we can email you when the site opens." };

  const service = createServiceSupabase();
  if (!service) return { ok: false, error: "The list isn't taking names just now. Try again shortly." };

  const hash = await ipHash();
  if (hash) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await service
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", hash)
      .gte("created_at", since);
    if ((count ?? 0) >= PER_HOUR) return { ok: false, error: "That's a few too many in a row. Try again later." };
  }

  // Which profession to record. A coach is the coaches row; a horse care
  // professional is whichever they picked, or nothing if they didn't.
  let professionId: string | null = null;
  const professions = await getProfessions();
  if (input.role === "coach") {
    professionId = professions.find((p) => p.door === "coaches")?.id ?? null;
  } else if (input.role === "horse_care" && input.profession) {
    professionId = professions.find((p) => p.slug === input.profession)?.id ?? null;
  }

  const now = new Date().toISOString();
  // Already on the list: update what they told us and clear any earlier
  // unsubscribe, but send nothing. Re-sending the confirmation on every POST
  // would turn this form into a way to mail somebody else's inbox repeatedly.
  const { data: existing } = await service.from("waitlist").select("id").eq("email", email).maybeSingle();
  if (existing) {
    await service
      .from("waitlist")
      .update({ role: input.role, profession_id: professionId, consented: true, consented_at: now, unsubscribed_at: null })
      .eq("id", existing.id);
    return { ok: true, already: true };
  }

  const { data: row, error } = await service
    .from("waitlist")
    .insert({ email, role: input.role, profession_id: professionId, consented: true, consented_at: now, source: "coming-soon", ip_hash: hash })
    .select("unsubscribe_token")
    .single();

  // 23505 is the unique index: two submissions at once, so the other won.
  if (error) {
    if (error.code === "23505") return { ok: true, already: true };
    console.error("waitlist insert failed", error);
    return { ok: false, error: "Something went wrong saving that. Try again shortly." };
  }

  const copy = await getContent("email.waitlist");
  const links = unsubscribeLinks("waitlist", row.unsubscribe_token);
  await sendEmail({
    to: email,
    subject: copy.subject,
    text: fillVariables(copy.body, { unsubscribe_url: links.page }),
    unsubscribe: links.oneClick,
  });

  return { ok: true, already: false };
}
