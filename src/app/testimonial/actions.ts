"use server";

import { headers } from "next/headers";
import { createServiceSupabase } from "@/lib/supabase/service";
import { deviceHash } from "@/lib/reviews";
import { notifyTestimonialWaiting, TESTIMONIAL_LIMITS, testimonialTarget } from "@/lib/testimonials";

export type TestimonialResult = { ok: boolean; message: string; sent?: boolean };

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim().replace(/\s+/g, " ");

/**
 * A client's testimonial from a professional's request link. It waits for
 * the professional to show it; it never goes up by itself. Written with the
 * service role because the client isn't signed in.
 */
export async function submitTestimonial(_prev: TestimonialResult, fd: FormData): Promise<TestimonialResult> {
  // A field people can't see: anything that fills it in is a bot.
  if (String(fd.get("website") ?? "")) return { ok: true, message: "", sent: true };
  const service = createServiceSupabase();
  if (!service) return { ok: false, message: "This isn't connected yet." };

  const target = await testimonialTarget(service, String(fd.get("slug") ?? ""));
  if (!target) return { ok: false, message: "This link isn't taking testimonials at the moment." };

  const quote = String(fd.get("quote") ?? "").trim().replace(/\r\n/g, "\n");
  const name = clean(fd.get("name"));
  const place = clean(fd.get("place"));
  const L = TESTIMONIAL_LIMITS;
  if (quote.length < L.quoteMin) return { ok: false, message: "Write a sentence or two about what it was like." };
  if (quote.length > L.quote) return { ok: false, message: `That's a bit long for a testimonial. Keep it under ${L.quote} characters.` };
  if (!name || name.length > L.name) return { ok: false, message: "Add your name, as you'd like it shown." };
  if (place.length > L.place) return { ok: false, message: "Keep the town short, like Bendigo." };
  if (fd.get("consent") !== "on") return { ok: false, message: "Tick the box to say they can show it." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  const device = deviceHash(ip, h.get("user-agent") ?? "");
  const { count } = await service
    .from("testimonials")
    .select("id", { count: "exact", head: true })
    .eq("device_hash", device)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 5) return { ok: false, message: "That's a lot of testimonials from one place today. Try again tomorrow." };

  const { error } = await service.from("testimonials").insert({
    provider_id: target.id,
    quote,
    author_name: name,
    author_place: place,
    status: "pending",
    source: "request",
    consent_at: new Date().toISOString(),
    device_hash: device,
    sort_order: 1000,
  });
  if (error) return { ok: false, message: "That didn't send. Try again in a minute." };
  await notifyTestimonialWaiting(service, target.id, name, quote);
  return { ok: true, message: "", sent: true };
}
