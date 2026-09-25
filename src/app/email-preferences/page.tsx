import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { consentStatus, currentWording, PURPOSE_LABELS, recordConsent, stopEverything, type Purpose } from "@/lib/audience";

export const metadata = { title: "Email preferences", robots: { index: false, follow: false } };

const TOKEN = /^[a-f0-9]{32,80}$/;

/** Which topics this person can choose between: their role's, plus any they've agreed to before. */
async function topicsFor(role: string | null, status: Partial<Record<Purpose, boolean>>): Promise<Purpose[]> {
  const base: Purpose[] = role === "provider" ? ["provider_news"] : role === "rider" ? ["rider_alerts", "rider_news"] : [];
  const extra = (Object.keys(status) as Purpose[]).filter((p) => !base.includes(p) && p !== "invite");
  return [...base, ...extra];
}

async function load(token: string) {
  const service = createServiceSupabase();
  if (!service || !TOKEN.test(token)) return null;
  const { data: contact } = await service.from("contacts").select("id, email, profile_id, profiles(role)").eq("token", token).maybeSingle();
  if (!contact) return null;
  const role = (contact as unknown as { profiles: { role: string } | null }).profiles?.role ?? null;
  const status = await consentStatus(service, contact.id);
  return { service, contact: { id: contact.id as string, email: contact.email as string }, role, status, topics: await topicsFor(role, status) };
}

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

async function save(formData: FormData) {
  "use server";
  const token = String(formData.get("t") ?? "");
  const ctx = await load(token);
  if (!ctx) redirect("/email-preferences?done=unknown");
  const { service, contact, status, topics } = ctx!;
  const from = await ip();
  let granted = false;
  for (const purpose of topics) {
    const want = formData.get(purpose) === "on";
    if (want === Boolean(status[purpose])) continue;
    if (want) {
      const wording = await currentWording(service, purpose);
      await recordConsent(service, { contactId: contact.id, purpose, action: "grant", type: "express", wordingId: wording?.id, source: "preferences", ip: from });
      granted = true;
    } else {
      await recordConsent(service, { contactId: contact.id, purpose, action: "withdraw", source: "preferences", method: "preferences", ip: from });
    }
  }
  // Choosing to hear from us again lifts an earlier "stop everything".
  if (granted) await service.from("suppressions").delete().eq("email", contact.email).eq("reason", "unsubscribe_all");
  redirect(`/email-preferences?t=${token}&done=saved`);
}

async function stopAll(formData: FormData) {
  "use server";
  const token = String(formData.get("t") ?? "");
  const ctx = await load(token);
  if (!ctx) redirect("/email-preferences?done=unknown");
  await stopEverything(ctx!.service, ctx!.contact, "preferences", "preferences");
  redirect(`/email-preferences?t=${token}&done=stopped`);
}

/**
 * /email-preferences (The Marketing Engine M1): reached from the footer of
 * every commercial email by the contact's token, no login. Each topic on or
 * off, with the words it means, and "stop everything". Nothing changes on
 * page load, only on a button, so mail scanners can't change anything.
 * Emails about someone's own account (an enquiry, their bill) aren't topics:
 * those keep coming while the account is open.
 */
export default async function EmailPreferencesPage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t = "", done } = await searchParams;
  const ctx = await load(t);
  if (!ctx) {
    return (
      <AuthShell eyebrow="Emails" title="Link not recognised" lead="This link doesn't match anyone on our list. It may be from an old email, or already used to stop everything.">
        <p className="text-[14px] text-muted">
          If you have an account, you can change alerts from <Link href="/account" className="font-medium text-accent">your account</Link>.
        </p>
      </AuthShell>
    );
  }
  const wordings = Object.fromEntries(await Promise.all(ctx.topics.map(async (p) => [p, (await currentWording(ctx.service, p))?.body ?? ""])));
  const note =
    done === "saved" ? "Saved. That takes effect straight away." : done === "stopped" ? "Done. We won't send you anything but emails about your own account." : null;

  return (
    <AuthShell eyebrow="Emails" title="What we send you" lead={`For ${ctx.contact.email}. Untick anything you'd rather not get.`}>
      {note && (
        <p role="status" className="mb-5 rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">
          {note}
        </p>
      )}
      {ctx.topics.length === 0 ? (
        <p className="text-[14px] text-muted">There&rsquo;s nothing on the list for you to choose.</p>
      ) : (
        <form action={save} className="flex flex-col gap-4">
          <input type="hidden" name="t" value={t} />
          {ctx.topics.map((p) => (
            <label key={p} className="flex gap-3 rounded-[14px] border border-border bg-surface p-3.5">
              <input type="checkbox" name={p} defaultChecked={Boolean(ctx.status[p])} className="mt-1 accent-accent" />
              <span>
                <span className="block text-[15px] font-medium text-fg">{PURPOSE_LABELS[p]}</span>
                {wordings[p] && <span className="mt-0.5 block text-[13px] leading-[1.45] text-subtle">{wordings[p]}</span>}
              </span>
            </label>
          ))}
          <Button type="submit" className="h-12 w-full text-[15px]">Save</Button>
        </form>
      )}
      <form action={stopAll} className="mt-6 border-t border-border pt-5">
        <input type="hidden" name="t" value={t} />
        <p className="text-[14px] text-muted">Or stop every email that isn&rsquo;t about your own account.</p>
        <button type="submit" className="mt-2 text-[14px] font-medium text-danger underline-offset-2 hover:underline">Stop everything</button>
      </form>
    </AuthShell>
  );
}
