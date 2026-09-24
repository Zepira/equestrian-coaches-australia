import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getCoachingId, DISCIPLINE_CONTENT_COLUMNS } from "@/lib/supabase/queries";
import { disciplineImage, type DisciplineContent } from "@/lib/discipline-content";
import { createDiscipline } from "./actions";
import { disciplinePath } from "@/lib/page-paths";

export const metadata = { title: "Disciplines" };

/**
 * /admin/disciplines — every discipline (active or not) with what's filled
 * in and what isn't, a link into its editor, and the form that adds one.
 * Admins see inactive rows too (the terms RLS policy lets is_admin() read
 * them); the public pages only ever read active = true.
 */
export default async function AdminDisciplinesPage() {
  const supabase = await createClient();
  if (!supabase) return null;

  const [{ data }, { data: tagRows }] = await Promise.all([
    supabase.from("terms").select(DISCIPLINE_CONTENT_COLUMNS).eq("kind", "discipline").eq("parent_id", (await getCoachingId(supabase)) ?? "").order("name"),
    supabase.from("provider_terms").select("term_id"),
  ]);
  const rows = (data ?? []) as DisciplineContent[];
  const coachCount = new Map<string, number>();
  for (const r of tagRows ?? []) coachCount.set(r.term_id, (coachCount.get(r.term_id) ?? 0) + 1);

  const Dot = ({ on, label }: { on: boolean; label: string }) => (
    <span className={`inline-flex items-center gap-1 ${on ? "text-fg" : "text-subtle/60"}`} title={on ? `${label}: set` : `${label}: not set`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${on ? "bg-success" : "bg-border"}`} />
      {label}
    </span>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[26px] leading-none text-ink">Disciplines</h2>
        <p className="text-[14px] text-muted">
          Each row is a public page at <code className="text-[13px]">/coaches/[discipline]</code>. Name, blurb, photo, long copy and SEO fields are edited here; the URL slug and the 301 that goes with changing it live under{" "}
          <Link href="/admin/terms" className="text-accent underline-offset-2 hover:underline">Terms</Link>.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((d) => {
          const img = disciplineImage(d, 200);
          const coaches = coachCount.get(d.id) ?? 0;
          return (
            <li
              key={d.id}
              className={`flex items-center gap-3.5 rounded-[14px] border border-border bg-surface p-3 ${d.active === false ? "opacity-55" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" className="h-14 w-14 shrink-0 rounded-t-[28px] rounded-b-[6px] object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <span className="font-display text-[20px] leading-none text-ink">{d.name}</span>
                  <span className="text-[12px] text-subtle">/{d.slug}</span>
                  {d.active === false && (
                    <span className="rounded-[var(--radius-pill)] bg-shade px-2 py-px text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">Hidden</span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                  <Dot on={Boolean(d.blurb)} label="Blurb" />
                  <Dot on={Boolean(d.description)} label="Long copy" />
                  <Dot on={img.uploaded} label="Own photo" />
                  <Dot on={Boolean(d.seo_title || d.seo_description)} label="SEO" />
                  <span className="text-subtle">{coaches} coach{coaches === 1 ? "" : "es"} tagged</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-[14px]">
                <Link href={disciplinePath(d.slug)} target="_blank" className="hidden text-subtle hover:text-fg sm:inline">
                  View
                </Link>
                <Link href={`/admin/disciplines/${d.id}`} className="font-medium text-accent hover:text-accent-hover">
                  Edit
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[26px] leading-none text-ink">Add a discipline</h2>
        <p className="mt-1.5 text-[14px] text-muted">Starts as a name and a URL; you land in its editor to add the rest. It shows on the site straight away, so add the blurb before you leave.</p>
        <form action={createDiscipline} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-sm font-medium text-fg">Name</span>
            <input name="name" required maxLength={80} placeholder="e.g. Polocrosse" className="w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-fg" />
          </label>
          <Button type="submit">Add</Button>
        </form>
      </section>
    </div>
  );
}
