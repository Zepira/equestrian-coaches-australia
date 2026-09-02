import { notFound } from "next/navigation";
import { DisciplineTag } from "@/components/discipline-tag";
import { LinkButton } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { createClient } from "@/lib/supabase/server";
import { joinedRelation } from "@/lib/supabase/joined-relation";
import { breadcrumbSchema, clinicEventSchema } from "@/lib/structured-data";

async function getClinic(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("clinics")
    .select(
      "title, description, location_text, start_date, end_date, terms(slug, name), coach_profiles(slug, profiles!coach_profiles_id_fkey(name))"
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clinic = await getClinic(id);
  if (!clinic) return { title: "Clinic not found" };
  return { title: clinic.title, description: `${clinic.title} — ${clinic.location_text}.` };
}

export default async function ClinicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clinic = await getClinic(id);
  if (!clinic) notFound();

  const discipline = joinedRelation<{ slug: string; name: string }>(clinic, "terms");
  const coach = joinedRelation<{ slug: string; profiles: { name: string } | null }>(clinic, "coach_profiles");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <JsonLd
        data={[
          clinicEventSchema({
            id,
            title: clinic.title,
            description: clinic.description,
            locationText: clinic.location_text,
            startDate: clinic.start_date,
            endDate: clinic.end_date,
            coach: coach ? { name: coach.profiles?.name ?? "Coach", slug: coach.slug } : null,
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            ...(coach ? [{ name: coach.profiles?.name ?? "Coach", url: `/coaches/${coach.slug}` }] : []),
            { name: clinic.title, url: `/clinics/${id}` },
          ]),
        ]}
      />
      {discipline && (
        <div className="mb-3">
          <DisciplineTag slug={discipline.slug} />
        </div>
      )}
      <h1 className="text-2xl font-bold text-fg sm:text-3xl">{clinic.title}</h1>
      <p className="mt-2 text-muted">
        {new Date(clinic.start_date).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        {clinic.end_date &&
          ` – ${new Date(clinic.end_date).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}`}{" "}
        · {clinic.location_text}
      </p>

      {clinic.description && <p className="mt-6 text-fg">{clinic.description}</p>}

      {coach && (
        <section className="mt-8 rounded-[var(--radius-tile)] border border-border bg-surface p-5">
          <div className="text-sm text-muted">Hosted by</div>
          <div className="mt-1 text-lg font-semibold text-fg">{coach.profiles?.name ?? "Coach"}</div>
          <LinkButton href={`/coaches/${coach.slug}`} variant="secondary" className="mt-4">
            View coach profile
          </LinkButton>
        </section>
      )}
    </div>
  );
}
