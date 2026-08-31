import { JsonLd } from "@/components/json-ld";
import { DisciplineBentoAll } from "@/components/discipline-bento";
import { createClient } from "@/lib/supabase/server";
import { getDisciplineCoachCounts } from "@/lib/supabase/queries";
import { getMockCoachesByDiscipline } from "@/lib/mock-coaches";
import { disciplines } from "@/lib/disciplines";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata = {
  title: "Browse disciplines",
  description:
    "Every discipline coached on Equestrian Coaches Australia, from dressage to liberty — find coaches by what they actually teach.",
};

export default async function DisciplinesPage() {
  const supabase = await createClient();
  const realCounts = await getDisciplineCoachCounts(supabase);

  const withCounts = disciplines.map((d) => ({
    ...d,
    count: (realCounts[d.slug] ?? 0) + getMockCoachesByDiscipline(d.slug).length,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <JsonLd
        data={[breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Disciplines", url: "/disciplines" }])]}
      />
      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Every discipline</div>
      <h1 className="mt-3 max-w-2xl text-4xl leading-[1.05] text-ink sm:text-5xl">
        Start with the discipline you ride.
      </h1>
      <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted">
        {disciplines.length} disciplines, coached by the people who actually teach them — not a keyword match.
      </p>

      <div className="mt-10">
        <DisciplineBentoAll disciplines={withCounts} />
      </div>
    </div>
  );
}
