import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { fillVariables, getContent } from "@/lib/cms/read";
import { longDate } from "@/lib/competitions";
import { confirmEntry } from "../actions";

export const metadata = { title: "Confirm your entry", robots: { index: false, follow: false } };

/** The link in "Confirm your entry" lands here. One button, so the entry only counts when a person presses it. */
export default async function ConfirmEntryPage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; c?: string }> }) {
  const { t, done, c } = await searchParams;
  const service = createServiceSupabase();
  const { data: comp } = c && service ? await service.from("competitions").select("title, slug, winners_by").eq("slug", c).maybeSingle() : { data: null };
  const back = comp ? <Link href={`/competitions/${comp.slug}`} className="font-medium text-accent">Back to {comp.title}</Link> : <Link href="/competitions" className="font-medium text-accent">Competitions</Link>;
  if (done === "in") {
    const w = await getContent("competitions.words");
    return (
      <AuthShell eyebrow="Competition" title="You're entered" lead={fillVariables(w.confirmed, { winners_by: comp?.winners_by ? longDate(comp.winners_by) : "the date in the terms" })}>
        <p className="text-[14px] text-muted">{back}</p>
      </AuthShell>
    );
  }
  if (done === "late") {
    return (
      <AuthShell eyebrow="Competition" title="Entries have closed" lead="The entry had to be confirmed before the close, so this one doesn't count. Sorry.">
        <p className="text-[14px] text-muted">{back}</p>
      </AuthShell>
    );
  }
  if (done === "unknown" || !t) {
    return (
      <AuthShell eyebrow="Competition" title="That link has expired" lead="It may already have been used.">
        <p className="text-[14px] text-muted">{back}</p>
      </AuthShell>
    );
  }
  return (
    <AuthShell eyebrow="Competition" title="Confirm your entry?" lead="Press the button and your entry counts.">
      <form action={confirmEntry}>
        <input type="hidden" name="t" value={t} />
        <Button type="submit" className="h-12 w-full text-[15px]">Confirm my entry</Button>
      </form>
    </AuthShell>
  );
}
