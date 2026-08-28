"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) throw new Error("Not an admin.");
  return supabase;
}

export async function addAlias(formData: FormData) {
  const supabase = await requireAdmin();

  const termId = String(formData.get("term_id") ?? "");
  const alias = String(formData.get("alias") ?? "").trim().toLowerCase();
  if (!termId || !alias) throw new Error("A term and an alias are required.");

  const { error } = await supabase
    .from("term_aliases")
    .insert({ term_id: termId, alias, source: "admin" });
  if (error) throw error;

  revalidatePath("/admin/aliases");
}

export async function removeAlias(aliasId: string) {
  const supabase = await requireAdmin();

  const { error } = await supabase.from("term_aliases").delete().eq("id", aliasId);
  if (error) throw error;

  revalidatePath("/admin/aliases");
}
