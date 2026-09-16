import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAttributes, getSkills } from "@/lib/supabase/queries";

// The skill and attribute vocabulary for the "Skills & setup" picker.
// Pages that render the picker server-side pass the terms straight in; this
// exists for the one place that can't — the filter rail inside SiteHeader,
// which is a client component shared by every route and so has no server
// data of its own. Public, and nothing here is per-user, so it caches.
export const revalidate = 3600;

export async function GET() {
  const supabase = await createClient();
  const [skills, attributes] = await Promise.all([getSkills(supabase), getAttributes(supabase)]);
  const strip = (t: { slug: string; name: string }) => ({ slug: t.slug, name: t.name });
  return NextResponse.json({ skills: skills.map(strip), attributes: attributes.map(strip) });
}
