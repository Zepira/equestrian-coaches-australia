import { Hero } from "@/components/hero";
import { FeaturedDisciplines } from "@/components/featured-disciplines";
import { FeaturedCoaches } from "@/components/featured-coaches";
import { HowItWorks } from "@/components/how-it-works";
import { CoachCallToAction } from "@/components/coach-call-to-action";
import { disciplines } from "@/lib/disciplines";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { createClient } from "@/lib/supabase/server";
import { searchCoaches, getSkills, getAttributes } from "@/lib/supabase/queries";
import { searchMockCoaches } from "@/lib/mock-coaches";

const FEATURED_COACH_COUNT = 4;
const TOP_DISCIPLINE_COUNT = 3;
const MORE_DISCIPLINE_COUNT = 6;

export default async function Home() {
  const supabase = await createClient();
  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const [featured, skills, attributes] = await Promise.all([
    supabase
      ? [...(await searchCoaches(supabase, {})), ...searchMockCoaches({})].slice(0, FEATURED_COACH_COUNT)
      : placeholderCoaches.slice(0, FEATURED_COACH_COUNT).map(toCoachCardData),
    getSkills(supabase),
    getAttributes(supabase),
  ]);
  const topDisciplines = disciplines.slice(0, TOP_DISCIPLINE_COUNT);
  const moreDisciplines = disciplines.slice(TOP_DISCIPLINE_COUNT, TOP_DISCIPLINE_COUNT + MORE_DISCIPLINE_COUNT);

  return (
    <>
      <Hero skills={skills} attributes={attributes} />
      <FeaturedDisciplines topDisciplines={topDisciplines} moreDisciplines={moreDisciplines} />
      <FeaturedCoaches coaches={featured} />
      <HowItWorks />
      <CoachCallToAction />
    </>
  );
}
