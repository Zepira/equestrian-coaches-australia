"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createServiceSupabase } from "@/lib/supabase/service";
import { SEQUENCES } from "@/lib/sequences";

/**
 * Admin → Sequences (M7): a sequence on or off, and each step's delay and
 * switch. What starts and stops a sequence is code; the words are on Emails.
 */
const back = (m: string, key = "done") => redirect(`/admin/sequences?${key}=${encodeURIComponent(m)}`);

export async function setSequenceActive(key: string, active: boolean) {
  const { userId } = await requireAdmin();
  if (!SEQUENCES.some((s) => s.key === key)) back("Unknown sequence.", "error");
  await createServiceSupabase()!.from("sequences").update({ active, updated_by: userId, updated_at: new Date().toISOString() }).eq("key", key);
  revalidatePath("/admin/sequences");
  back(active ? "Switched on. It starts with anything from the last two weeks at the next run." : "Switched off. People part way through wait where they are.");
}

export async function saveSteps(key: string, fd: FormData) {
  await requireAdmin();
  const def = SEQUENCES.find((s) => s.key === key);
  if (!def) back("Unknown sequence.", "error");
  const service = createServiceSupabase()!;
  for (let i = 1; i <= def!.delays.length; i++) {
    const days = Number(fd.get(`delay_${i}`));
    if (!Number.isFinite(days) || days < 0 || days > 90) back(`Step ${i}: the wait is 0 to 90 days.`, "error");
    await service
      .from("sequence_steps")
      .update({ delay_hours: Math.round(days * 24), active: fd.get(`active_${i}`) === "on" })
      .eq("sequence_key", key)
      .eq("position", i);
  }
  revalidatePath("/admin/sequences");
  back(`Saved ${def!.name}.`);
}
