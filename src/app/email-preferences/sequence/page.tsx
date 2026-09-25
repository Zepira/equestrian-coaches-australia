import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { SEQUENCES } from "@/lib/sequences";

export const metadata = { title: "Stop these emails", robots: { index: false, follow: false } };

/** The one-click stop at the foot of every sequence email. A button, because mail scanners open links. */
async function stopSequence(fd: FormData) {
  "use server";
  const t = String(fd.get("t") ?? "");
  const service = createServiceSupabase();
  if (!service || !/^[a-f0-9]{32,80}$/.test(t)) redirect("/email-preferences/sequence?done=unknown");
  await service!.from("sequence_runs").update({ stopped_at: new Date().toISOString(), stop_reason: "asked to stop", next_at: null }).eq("stop_token", t).is("stopped_at", null);
  redirect("/email-preferences/sequence?done=stopped");
}

export default async function StopSequencePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await searchParams;
  if (done === "stopped") {
    return (
      <AuthShell eyebrow="Emails" title="Stopped" lead="You won't get any more of these. Emails about your own enquiries and account still come.">
        <p className="text-[14px] text-muted"><Link href="/" className="font-medium text-accent">Back to the home page</Link></p>
      </AuthShell>
    );
  }
  const service = createServiceSupabase();
  const { data: run } = service && t && /^[a-f0-9]{32,80}$/.test(t) ? await service.from("sequence_runs").select("sequence_key, stopped_at").eq("stop_token", t).maybeSingle() : { data: null };
  if (!run || done === "unknown") {
    return (
      <AuthShell eyebrow="Emails" title="That link has expired" lead="These emails may have finished already.">
        <p className="text-[14px] text-muted"><Link href="/" className="font-medium text-accent">Back to the home page</Link></p>
      </AuthShell>
    );
  }
  const name = SEQUENCES.find((s) => s.key === run.sequence_key)?.name ?? "these emails";
  return (
    <AuthShell eyebrow="Emails" title={`Stop the "${name}" emails?`} lead={run.stopped_at ? "They've already stopped." : "Press the button and we won't send the rest."}>
      {!run.stopped_at && (
        <form action={stopSequence}>
          <input type="hidden" name="t" value={t} />
          <Button type="submit" className="h-12 w-full text-[15px]">Stop them</Button>
        </form>
      )}
    </AuthShell>
  );
}
