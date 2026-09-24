"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminSetHidden } from "@/lib/provider-lifecycle";
import { createServiceSupabase } from "@/lib/supabase/service";

/**
 * Hide or show a profile from the Providers screen (§10). Status changes go
 * through provider-lifecycle with the service role, like every other one.
 */
export async function setProviderHidden(providerId: string, hidden: boolean) {
  const { userId } = await requireAdmin();
  const service = createServiceSupabase();
  if (!service) throw new Error("The service key isn't set.");
  await adminSetHidden(service, providerId, userId, hidden);
  revalidatePath("/admin/providers");
  revalidatePath("/search");
}
