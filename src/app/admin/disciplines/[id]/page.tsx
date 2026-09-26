import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DISCIPLINE_CONTENT_COLUMNS } from "@/lib/supabase/queries";
import type { DisciplineContent } from "@/lib/discipline-content";
import { DisciplineForm } from "./discipline-form";
import { deleteDiscipline, setDisciplineActive } from "../actions";
import { termPath } from "@/lib/page-paths";

export const metadata = { title: "Edit discipline" };

export default async function AdminDisciplineEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return null;

  const [{ data }, { count: coaches }, { count: clinics }] = await Promise.all([
    supabase.from("terms").select(`${DISCIPLINE_CONTENT_COLUMNS}, parent:parent_id(slug, name)`).eq("id", id).eq("kind", "discipline").maybeSingle(),
    supabase.from("provider_terms").select("*", { count: "exact", head: true }).eq("term_id", id),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("term_id", id),
  ]);
  if (!data) notFound();
  const discipline = data as unknown as DisciplineContent;
  const parent = (data as unknown as { parent: { slug: string; name: string } | null }).parent ?? { slug: "coaches", name: "Coaches" };
  const livePath = termPath(parent.slug, discipline.slug);
  const referenced = (coaches ?? 0) + (clinics ?? 0) > 0;
  const active = discipline.active !== false;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/admin/disciplines?p=${parent.slug}`} className="text-[13px] text-subtle hover:text-fg">← {parent.name}</Link>
          <h2 className="mt-2 font-display text-[30px] leading-none text-ink">{discipline.name}</h2>
          <p className="mt-1.5 text-[13px] text-subtle">
            Live at{" "}
            <Link href={livePath} target="_blank" className="text-accent underline-offset-2 hover:underline">
              {livePath}
            </Link>
            {" · "}
            {coaches ?? 0} coach{coaches === 1 ? "" : "es"}, {clinics ?? 0} clinic{clinics === 1 ? "" : "s"}
            {" · "}
            <Link href="/admin/terms" className="text-subtle underline-offset-2 hover:underline">change the slug under Terms</Link>
          </p>
        </div>
        <div className="flex items-center gap-3 text-[14px]">
          <form action={setDisciplineActive.bind(null, discipline.id, !active)}>
            <button type="submit" className={`rounded-[var(--radius-pill)] border px-3.5 py-1.5 font-medium ${active ? "border-border text-danger hover:bg-shade" : "border-accent bg-accent text-accent-fg"}`}>
              {active ? "Hide from site" : "Show on site"}
            </button>
          </form>
          {!referenced && (
            <form action={deleteDiscipline.bind(null, discipline.id)}>
              <button type="submit" className="text-subtle underline-offset-2 hover:text-danger hover:underline" title="Nothing references this discipline, so it can be deleted outright">
                Delete
              </button>
            </form>
          )}
        </div>
      </div>

      {!active && (
        <p className="rounded-[12px] border border-border bg-accent-soft px-4 py-3 text-[14px] text-fg">
          Hidden: this discipline is off the site, out of search and out of the profile editor. Coaches who tagged it keep the tag and get it back when you show it again.
        </p>
      )}

      <DisciplineForm discipline={discipline} />
    </div>
  );
}
