import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { phase, type Competition } from "@/lib/competitions";
import { createCompetition } from "./actions";

export const metadata = { title: "Competitions" };
const LABEL: Record<string, string> = { draft: "Draft", upcoming: "Public, not open yet", open: "Open", closed: "Closed, to judge", judged: "Result published" };

/** /admin/competitions (M10, Grow). */
export default async function AdminCompetitionsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const service = createServiceSupabase();
  if (!service) return null;
  const [{ data }, { data: entries }] = await Promise.all([
    service.from("competitions").select("*").order("created_at", { ascending: false }),
    service.from("competition_entries").select("competition_id, confirmed_at"),
  ]);
  const count = (id: string) => (entries ?? []).filter((e) => e.competition_id === id && e.confirmed_at).length;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Competitions</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          Free to enter, judged on skill against criteria you publish, which needs no permit anywhere. A random draw is allowed only up to $3,000 in prizes, the lowest permit threshold in Australia. The full terms are written from the fields and shown on the page.
        </p>
      </div>
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}
      <form action={createCompetition} className="flex max-w-[560px] gap-2">
        <input name="title" required placeholder="Best photo of you and your coach" aria-label="Title" className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg" />
        <Button type="submit">New competition</Button>
      </form>
      <ul className="flex flex-col text-[14px]" data-admin-competitions>
        {((data ?? []) as Competition[]).map((c) => (
          <li key={c.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
            <Link href={`/admin/competitions/${c.id}`} className="font-medium text-accent">{c.title}</Link>
            <span className="text-subtle">{LABEL[phase(c)]} · {count(c.id)} confirmed {count(c.id) === 1 ? "entry" : "entries"}</span>
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="text-subtle">None yet.</li>}
      </ul>
    </div>
  );
}
