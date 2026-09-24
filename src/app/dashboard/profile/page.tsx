import { createClient } from "@/lib/supabase/server";
import { getDisciplines, getSkills, getAttributes, ensureProvider, PROVIDER_PHOTOS } from "@/lib/supabase/queries";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Edit profile" };

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const disciplines = await getDisciplines(supabase);
  const skills = await getSkills(supabase);
  const attributes = await getAttributes(supabase);

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

  return (
    <ProfileForm
      configured
      coach={coach}
      disciplines={disciplines}
      skills={skills}
      attributes={attributes}
      selectedTermIds={(selected ?? []).map((s) => s.term_id)}
      photos={photosWithUrls}
      testimonials={testimonials ?? []}
      coachSlug={provider.slug}
    />
  );
}
