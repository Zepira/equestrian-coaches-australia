import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Protected titles (The Marketing Engine §05.12). "Physiotherapist" and
 * "chiropractor" are protected under the national health practitioner law
 * even for work on animals, and "specialist" is restricted for vets. Each
 * profession row lists its words (profession_details.protected_titles); a
 * profile may use them only once an admin has checked the provider's
 * registration against the public register (providers.registration_checked_at),
 * and "specialist" only with a specialist registration checked too.
 */
export async function protectedTitleProblem(
  supabase: SupabaseClient,
  providerId: string,
  text: string,
  /** The number being saved with this text: a changed number isn't the checked one. */
  newNumber?: string
): Promise<string | null> {
  const [{ data: rows }, { data: provider }] = await Promise.all([
    supabase.from("provider_terms").select("terms!inner(kind, profession_details(protected_titles))").eq("provider_id", providerId).eq("terms.kind", "profession"),
    supabase.from("providers").select("registration_number, registration_checked_at, specialist_checked").eq("id", providerId).single(),
  ]);
  const words = [
    ...new Set(
      (rows ?? []).flatMap((r) => ((r as unknown as { terms: { profession_details: { protected_titles: string[] } | null } }).terms.profession_details?.protected_titles ?? []))
    ),
  ];
  const numberChanged = newNumber !== undefined && newNumber !== (provider?.registration_number ?? "");
  for (const word of words) {
    if (!new RegExp(`\\b${word.replace(/[^a-z]/gi, "")}\\b`, "i").test(text)) continue;
    const allowed = !numberChanged && (word.toLowerCase() === "specialist" ? Boolean(provider?.specialist_checked) : Boolean(provider?.registration_checked_at));
    if (!allowed) {
      return word.toLowerCase() === "specialist"
        ? `"Specialist" can only be used by a registered veterinary specialist. Add your registration number below and we'll check it against the register.`
        : `"${word}" is a protected title in Australia, even for work with animals. Add your registration number below and, once we've checked it against the public register, you can use it. Until then, describe the work instead (for example "equine physiotherapy").`;
    }
  }
  return null;
}
