import { createClient } from "@/lib/supabase/server";
import { getDisciplines, getSkills, getAttributes, ensureCoachProfile } from "@/lib/supabase/queries";
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

  const coach = await ensureCoachProfile(supabase, user.id, profile?.name ?? "Coach");

  const [{ data: selected }, { data: photos }, { data: testimonials }] = await Promise.all([
    supabase.from("coach_terms").select("term_id").eq("coach_id", user.id),
    supabase
      .from("coach_photos")
      .select("id, storage_path, sort_order")
      .eq("coach_id", user.id)
      .order("sort_order"),
    supabase
      .from("testimonials")
      .select("id, author_name, quote")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const photosWithUrls = (photos ?? []).map((photo) => ({
    ...photo,
    url: supabase.storage.from("coach-photos").getPublicUrl(photo.storage_path).data.publicUrl,
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
    />
  );
}
