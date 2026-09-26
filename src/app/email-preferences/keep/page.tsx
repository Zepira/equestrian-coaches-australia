import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";

export const metadata = { title: "Keep your emails", robots: { index: false, follow: false } };

/**
 * The button in "Do you still want our emails?" (stage E, the quiet rider
 * check). Pressing it ends the check and counts as being around, so the next
 * check is a long way off. A button, not the link itself, because mail
 * scanners open links and would answer for everyone.
 */
async function keepEmails(fd: FormData) {
  "use server";
  const t = String(fd.get("t") ?? "");
  const service = createServiceSupabase();
  if (!service || !/^[a-f0-9]{32,80}$/.test(t)) redirect("/email-preferences/keep?done=unknown");
  const { data: run } = await service!.from("sequence_runs").select("id, contact_id, stopped_at").eq("stop_token", t).eq("sequence_key", "quiet_rider").maybeSingle();
  if (!run) redirect("/email-preferences/keep?done=unknown");
  if (!run!.stopped_at) {
    await service!.from("sequence_runs").update({ stopped_at: new Date().toISOString(), stop_reason: "wants to stay", next_at: null }).eq("id", run!.id);
    await service!.from("email_events").insert({ contact_id: run!.contact_id, sequence_run_id: run!.id, type: "clicked", link: "keep my emails" });
  }
  redirect(`/email-preferences/keep?done=${run!.stopped_at ? "late" : "kept"}`);
}

export default async function KeepEmailsPage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await searchParams;
  if (done === "kept") {
    return (
      <AuthShell eyebrow="Emails" title="Thanks, you're staying" lead="Your alerts and the monthly round-up carry on as before.">
        <p className="text-[14px] text-muted"><Link href="/account" className="font-medium text-accent">Your account</Link></p>
      </AuthShell>
    );
  }
  if (done === "late" || done === "unknown" || !t) {
    return (
      <AuthShell eyebrow="Emails" title={done === "late" ? "We'd already stopped" : "That link has expired"} lead="You can switch your emails back on from your account.">
        <p className="text-[14px] text-muted"><Link href="/account" className="font-medium text-accent">Your account</Link></p>
      </AuthShell>
    );
  }
  return (
    <AuthShell eyebrow="Emails" title="Keep getting our emails?" lead="Press the button and your alerts and the monthly round-up carry on.">
      <form action={keepEmails}>
        <input type="hidden" name="t" value={t} />
        <Button type="submit" className="h-12 w-full text-[15px]">Keep my emails</Button>
      </form>
    </AuthShell>
  );
}
