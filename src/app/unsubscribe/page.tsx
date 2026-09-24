import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { unsubscribe } from "@/lib/rider-email";

export const metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

/**
 * The unsubscribe link in every rider email (§07.4). One button, no login:
 * pressing it stops the alert (a=) or every email (r=) at once. It's a
 * button rather than stopping on page load because mail scanners open links
 * in emails, which would unsubscribe people who never asked.
 */
async function stop(formData: FormData) {
  "use server";
  const service = createServiceSupabase();
  const a = String(formData.get("a") ?? "") || undefined;
  const r = String(formData.get("r") ?? "") || undefined;
  const result = service ? await unsubscribe(service, { alert: a, rider: r }) : "unknown";
  redirect(`/unsubscribe?done=${result}`);
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ a?: string; r?: string; done?: string }> }) {
  const { a, r, done } = await searchParams;

  if (done) {
    const text =
      done === "all"
        ? "Done. We won't email you again. Your saved profiles are still in your account."
        : done === "alert"
          ? "Done. That alert is off, and you won't hear about it again. Any other alerts you have still work."
          : "That link didn't match an alert. It may already be off.";
    return (
      <AuthShell eyebrow="Emails" title={done === "unknown" ? "Nothing to stop" : "Unsubscribed"} lead={text}>
        <p className="text-[14px] leading-[1.5] text-muted">
          Changed your mind? You can set alerts up again from{" "}
          <Link href="/account" className="font-medium text-accent">
            your account
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Emails"
      title="Stop these emails?"
      lead={r ? "This stops every email we send you: alerts and the monthly round-up." : "This turns off the alert this email came from. Any other alerts keep working."}
    >
      <form action={stop}>
        {a && <input type="hidden" name="a" value={a} />}
        {r && <input type="hidden" name="r" value={r} />}
        <Button type="submit" className="h-12 w-full text-[15px]">
          {r ? "Stop every email" : "Turn off this alert"}
        </Button>
      </form>
    </AuthShell>
  );
}
