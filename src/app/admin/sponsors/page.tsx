import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { createSponsor } from "./actions";

export const metadata = { title: "Sponsors" };

/** /admin/sponsors (M11, Grow): who's booked, and how many slots are running today. */
export default async function AdminSponsorsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const service = createServiceSupabase();
  if (!service) return null;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  const [{ data: sponsors }, { data: slots }] = await Promise.all([
    service.from("sponsors").select("id, name, website").order("name"),
    service.from("sponsor_slots").select("sponsor_id, starts_on, ends_on, active"),
  ]);
  const running = (id: string) => (slots ?? []).filter((s) => s.sponsor_id === id && s.active && s.starts_on <= today && s.ends_on >= today).length;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Sponsors</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          Brands in the rider round-up, on guides, and on profession and area pages, sold by hand as fixed monthly packages. Every slot says &ldquo;Sponsored&rdquo;, sits outside any list of professionals, and is the same for everyone: no rider data goes into it. Each sponsor has a monthly report of showings and clicks.
        </p>
      </div>
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}
      <form action={createSponsor} className="flex max-w-[520px] gap-2">
        <input name="name" required placeholder="The brand's name" aria-label="Sponsor name" className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg" />
        <Button type="submit">New sponsor</Button>
      </form>
      <ul className="flex flex-col text-[14px]" data-admin-sponsors>
        {(sponsors ?? []).map((s) => (
          <li key={s.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
            <Link href={`/admin/sponsors/${s.id}`} className="font-medium text-accent">{s.name}</Link>
            <span className="text-subtle">{running(s.id)} running today</span>
          </li>
        ))}
        {(sponsors ?? []).length === 0 && <li className="text-subtle">None yet.</li>}
      </ul>
    </div>
  );
}
