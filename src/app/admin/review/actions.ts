"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { publish, requestChanges } from "@/lib/provider-lifecycle";

/** Admin check with the user's own client, then the service role for the write. */
async function requireReviewer() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) throw new Error("Not an admin.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const service = createServiceSupabase();
  if (!service || !user) throw new Error("Reviewing needs SUPABASE_SERVICE_ROLE_KEY.");
  return { service, reviewerId: user.id };
}

export async function publishProvider(providerId: string) {
  const { service, reviewerId } = await requireReviewer();
  await publish(service, providerId, reviewerId);
  redirect("/admin/review?done=published");
}

export async function askForChanges(providerId: string, formData: FormData) {
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!note) redirect(`/admin/review?error=${encodeURIComponent("Write the note they'll see first.")}`);
  const { service, reviewerId } = await requireReviewer();
  await requestChanges(service, providerId, reviewerId, note);
  redirect("/admin/review?done=changes");
}
