import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { changeLog } from "@/lib/admin";
import { getPlans } from "@/lib/settings";
import { termImagePublicUrl } from "@/lib/discipline-content";
import { professionPhoto } from "@/lib/mock-professionals";
import { sectionPath } from "@/lib/page-paths";
import { getSectionTerms } from "@/lib/sections";
import { HistoryList } from "../../history-list";
import { TermImagePanel } from "../../term-image-panel";
import { removeTermImage, uploadTermImage } from "../actions";
import { ProfessionForm, type ProfessionRow } from "./profession-form";

export const metadata = { title: "Edit profession" };

export default async function AdminProfessionEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return null;
  const [{ data }, { count: providers }, plans, specialities] = await Promise.all([
    supabase.from("terms").select("id, slug, name, blurb, image_path, profession_details(*)").eq("id", id).eq("kind", "profession").maybeSingle(),
    supabase.from("provider_terms").select("provider_id", { count: "exact", head: true }).eq("term_id", id),
    getPlans(),
    getSectionTerms(id),
  ]);
  if (!data?.profession_details) notFound();
  const row = data as unknown as ProfessionRow & { image_path: string | null };
  const uploaded = termImagePublicUrl(row.image_path);
  const history = await changeLog(supabase, { table: ["terms", "profession_details"], rowIds: [id] });
  const live = row.profession_details.launch_state === "live";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/professions" className="text-[13px] text-subtle hover:text-fg">← All professions</Link>
        <h2 className="mt-2 font-display text-[30px] leading-none text-ink">{row.name}</h2>
        <p className="mt-1.5 text-[13px] text-subtle">
          {live ? (
            <Link href={sectionPath(row.slug)} target="_blank" className="text-accent underline-offset-2 hover:underline">{sectionPath(row.slug)}</Link>
          ) : (
            <>Not on the site yet</>
          )}
          {" · "}
          {providers ?? 0} {providers === 1 ? "person" : "people"} on it
          {" · "}
          <Link href={`/admin/disciplines?p=${row.slug}`} className="text-subtle underline-offset-2 hover:underline">its {row.profession_details.term_noun_plural}</Link>
        </p>
      </div>
      <div className="grid gap-8 @[760px]/admin:grid-cols-[1fr_300px] @[760px]/admin:items-start">
        <ProfessionForm row={row} slugLocked={row.profession_details.launch_state !== "draft" || (providers ?? 0) > 0} planNames={Object.fromEntries(Object.entries(plans).map(([t, p]) => [t, p.name]))} specialities={specialities.map((t) => ({ id: t.id, name: t.name }))} />
        <div className="@[760px]/admin:sticky @[760px]/admin:top-24">
          <TermImagePanel
            src={uploaded ?? professionPhoto(row.slug, 800)}
            uploaded={Boolean(uploaded)}
            note="Shown on the Horse care page's list and at the top of the profession's section. Landscape, at least 1200px wide."
            upload={uploadTermImage.bind(null, id)}
            remove={removeTermImage.bind(null, id)}
          />
        </div>
      </div>
      <HistoryList rows={history} />
    </div>
  );
}
