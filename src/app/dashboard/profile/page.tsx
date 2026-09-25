import { createClient } from "@/lib/supabase/server";
import { getDisciplines, getSkills, getAttributes, ensureProvider, PROVIDER_PHOTOS } from "@/lib/supabase/queries";
import { getPlanCapabilities } from "@/lib/settings";
import { hasVideo } from "@/lib/tiers";
import { ProfileForm } from "./profile-form";
import { getSectionTerms } from "@/lib/sections";
import { getProfession } from "@/lib/cms/read";
import { FALLBACK_PROFESSIONS } from "@/lib/professions";

export const metadata = { title: "Edit profile" };

export default async function ProfileEditPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  let disciplines: { id: string; slug: string; name: string }[] = await getDisciplines(supabase);
  let skills: { id: string; slug: string; name: string }[] = await getSkills(supabase);
  let attributes: { id: string; slug: string; name: string }[] = await getAttributes(supabase);

  if (!supabase) {
    return (
      <ProfileForm
        configured={false}
        disciplines={disciplines}
        skills={skills}
        attributes={attributes}
        coach={null}
        selectedTermIds={[]}
        photos={[]}
        testimonials={[]}
      />
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy already redirects unauthenticated visits

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const provider = await ensureProvider(supabase, user.id, profile?.name ?? "Coach");
  const providerId = provider.id;

  // A horse care provider edits their own profession's specialities, and the
  // setup terms every profession shares; coaching's lists are coaching's.
  const { data: professionRow } = await supabase
    .from("provider_terms")
    .select("sort_order, terms!inner(id, slug, kind)")
    .eq("provider_id", providerId)
    .eq("terms.kind", "profession")
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  const primary = (professionRow as unknown as { terms: { id: string; slug: string } } | null)?.terms;
  const profession = (await getProfession(primary?.slug ?? "coaches")) ?? FALLBACK_PROFESSIONS[0];
  if (primary && primary.slug !== "coaches") {
    disciplines = await getSectionTerms(primary.id);
    skills = [];
    const { data: shared } = await supabase.from("terms").select("id, slug, name").eq("kind", "attribute").is("parent_id", null).eq("active", true).order("name");
    attributes = (shared ?? []) as typeof attributes;
  }

  const [{ data: selected }, { data: photos }, { data: testimonials }, { data: sub }] = await Promise.all([
    supabase.from("provider_terms").select("term_id").eq("provider_id", providerId),
    supabase
      .from("provider_photos")
      .select("id, storage_path, sort_order")
      .eq("provider_id", providerId)
      .order("sort_order"),
    supabase
      .from("testimonials")
      .select("id, author_name, quote")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("tier, status").eq("provider_id", providerId).maybeSingle(),
  ]);
  // The form still reads the plan off the profile object; it now comes from subscriptions.
  const coach = { ...provider, subscription_tier: sub?.tier ?? null, subscription_status: sub?.status ?? "inactive" } as unknown as Parameters<typeof ProfileForm>[0]["coach"];

  const photosWithUrls = (photos ?? []).map((photo) => ({
    ...photo,
    url: supabase.storage.from(PROVIDER_PHOTOS).getPublicUrl(photo.storage_path).data.publicUrl,
  }));

  // A registration number field for professions with protected titles (§05.12).
  const { data: titleRows } = await supabase
    .from("provider_terms")
    .select("terms!inner(kind, profession_details(protected_titles))")
    .eq("provider_id", providerId)
    .eq("terms.kind", "profession");
  const needsRegistration = (titleRows ?? []).some((r) => ((r as unknown as { terms: { profession_details: { protected_titles: string[] } | null } }).terms.profession_details?.protected_titles ?? []).length > 0);
  const p = provider as unknown as { registration_number?: string; registration_checked_at?: string | null };

  return (
    <ProfileForm
      error={error}
      registration={needsRegistration ? { number: p.registration_number ?? "", checkedAt: p.registration_checked_at ?? null } : null}
      configured
      coach={coach}
      disciplines={disciplines}
      skills={skills}
      attributes={attributes}
      selectedTermIds={(selected ?? []).map((s) => s.term_id)}
      photos={photosWithUrls}
      testimonials={testimonials ?? []}
      coachSlug={provider.slug}
      videoAllowed={hasVideo(sub?.tier, sub?.status, await getPlanCapabilities())}
      nouns={{ audience: profession.audienceNoun, years: profession.yearsLabel }}
    />
  );
}
