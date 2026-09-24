"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { CMS_TAG } from "@/lib/cms/read";
import { formText, requireAdmin } from "@/lib/admin";
import { areaPagePath } from "@/lib/page-paths";

/**
 * An area page's hand-written intro, per profession (§05.2, §10). Empty
 * removes it. change_log records every save.
 */
export async function saveAreaIntro(areaId: string, professionId: string, formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const body = formText(formData, "body", 3000);
  const [{ data: area }, { data: profession }] = await Promise.all([
    supabase.from("areas").select("slug").eq("id", areaId).single(),
    supabase.from("terms").select("slug").eq("id", professionId).eq("kind", "profession").single(),
  ]);
  if (!area || !profession) throw new Error("Not found.");

  if (body) {
    const { data: updated, error } = await supabase
      .from("area_intros")
      .update({ body, updated_at: new Date().toISOString(), updated_by: userId })
      .eq("area_id", areaId)
      .eq("profession_id", professionId)
      .select("area_id");
    if (error) throw error;
    if (!updated?.length) {
      const { error: insertError } = await supabase.from("area_intros").insert({ area_id: areaId, profession_id: professionId, body, updated_by: userId });
      if (insertError) throw insertError;
    }
  } else {
    await supabase.from("area_intros").delete().eq("area_id", areaId).eq("profession_id", professionId);
  }
  revalidateTag(CMS_TAG, { expire: 0 });
  revalidatePath(areaPagePath({ professionSlug: profession.slug, areaSlug: area.slug }));
  revalidatePath("/admin/areas");
  redirect(`/admin/areas?area=${areaId}&p=${profession.slug}&saved=1`);
}
