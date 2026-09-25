"use server";

import { joinWaitlist } from "@/lib/waitlist";

export type WaitlistResult = { ok: boolean; message: string };

/**
 * The coming soon page's form (src/components/waitlist-form.tsx). A server
 * action rather than a route handler, so the form still posts and still works
 * with JavaScript off, the same way the enquiry form does.
 *
 * The rules all live in src/lib/waitlist.ts; this only reads the fields and
 * turns the answer into something to show.
 */
export async function joinWaitlistAction(_prev: WaitlistResult | null, formData: FormData): Promise<WaitlistResult> {
  const result = await joinWaitlist({
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
    profession: String(formData.get("profession") ?? "") || undefined,
    consent: formData.get("consent") === "on",
    // Named like a real field so a bot fills it in. See the form for why it
    // is hidden the way it is.
    honeypot: String(formData.get("website") ?? ""),
  });

  if (!result.ok) return { ok: false, message: result.error };
  return {
    ok: true,
    message: result.already
      ? "You're already on the list. We'll email you when the site opens."
      : "You're on the list. There's a confirmation on its way to your inbox.",
  };
}
