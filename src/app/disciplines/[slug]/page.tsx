import { notFound } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { CoachCard } from "@/components/coach-card";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines, searchCoaches } from "@/lib/supabase/queries";
import { disciplines as staticDisciplines } from "@/lib/disciplines";
import { getCoachesByDiscipline, toCoachCardData } from "@/lib/placeholder-coaches";
import { getMockCoachesByDiscipline } from "@/lib/mock-coaches";

export function generateStaticParams() {
  return staticDisciplines.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const discipline = staticDisciplines.find((d) => d.slug === slug);
  return { title: discipline ? `${discipline.name} coaches` : "Discipline not found" };
}

export default async function DisciplinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const disciplines = await getDisciplines(supabase);
  const discipline = disciplines.find((d) => d.slug === slug);
  if (!discipline) notFound();

  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const coaches = supabase
    ? [...(await searchCoaches(supabase, { disciplineId: discipline.id })), ...getMockCoachesByDiscipline(slug)]
    : getCoachesByDiscipline(slug).map(toCoachCardData);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-fg sm:text-3xl">{discipline.name} coaches</h1>
      <p className="mt-2 max-w-xl text-muted">{discipline.blurb}</p>

      <div className="mt-6">
        <SearchBar defaultDiscipline={slug} />
      </div>

      <p className="mt-6 text-sm text-muted">
        {coaches.length} {discipline.name.toLowerCase()} coach{coaches.length === 1 ? "" : "es"} listed
      </p>

      {coaches.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach) => (
            <CoachCard key={coach.slug} coach={coach} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-muted">
          No {discipline.name.toLowerCase()} coaches listed yet — check back soon.
        </div>
      )}
    </div>
  );
}
