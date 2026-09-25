"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formText, requireAdmin } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";

/**
 * Promo codes (The Marketing Engine M6), mirrored to Stripe: with Stripe
 * connected a code makes a Stripe coupon and promotion code, and Stripe
 * decides what it does at checkout; without it (mock payments) the code is
 * kept here and counted the same way. change_log records each one.
 */
const back = (m: string, key = "error") => redirect(`/admin/codes?${key}=${encodeURIComponent(m)}`);

export async function createPromo(fd: FormData) {
  const { supabase, userId } = await requireAdmin();
  const code = formText(fd, "code", 24).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const description = formText(fd, "description", 120);
  const percent = Number(formText(fd, "percent_off"));
  const months = Number(formText(fd, "duration_months"));
  const maxRaw = formText(fd, "max_redemptions");
  const max = maxRaw ? Number(maxRaw) : null;
  const expires = formText(fd, "expires_on") || null;
  const firstTime = fd.get("first_time_only") === "on";
  if (code.length < 3) back("A code is 3 to 24 letters and numbers.");
  if (!description) back("Say who it's for and what it gives, for your own records.");
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) back("Percent off is a whole number from 1 to 100.");
  if (!Number.isInteger(months) || months < 1 || months > 24) back("It lasts 1 to 24 months.");
  if (max !== null && (!Number.isInteger(max) || max < 1)) back("The limit is a whole number, or empty for no limit.");
  if (expires && (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || new Date(`${expires}T00:00:00Z`) < new Date(new Date().toISOString().slice(0, 10)))) back("The last day to use it can't be in the past.");

  let couponId: string | null = null;
  let promotionId: string | null = null;
  const stripe = getStripe();
  if (stripe) {
    try {
      const coupon = await stripe.coupons.create({ percent_off: percent, duration: months === 1 ? "once" : "repeating", ...(months > 1 ? { duration_in_months: months } : {}), name: code });
      const promotion = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code,
        ...(max ? { max_redemptions: max } : {}),
        ...(expires ? { expires_at: Math.floor(new Date(`${expires}T23:59:59+10:00`).getTime() / 1000) } : {}),
        restrictions: { first_time_transaction: firstTime },
      } as never);
      couponId = coupon.id;
      promotionId = promotion.id;
    } catch (err) {
      back(`Stripe refused it: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }
  const { error } = await supabase.from("promo_codes").insert({
    code,
    description,
    percent_off: percent,
    duration_months: months,
    max_redemptions: max,
    expires_on: expires,
    first_time_only: firstTime,
    stripe_coupon_id: couponId,
    stripe_promotion_code_id: promotionId,
    created_by: userId,
  });
  if (error) back(error.code === "23505" ? `${code} exists already.` : error.message);
  revalidatePath("/admin/codes");
  back(`Made ${code}. To hand it out with a link, make a tracked link to /join/coaches?promo=${code}.`, "done");
}

export async function setPromoActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  const { data: row } = await supabase.from("promo_codes").select("stripe_promotion_code_id").eq("id", id).single();
  const stripe = getStripe();
  if (stripe && row?.stripe_promotion_code_id) await stripe.promotionCodes.update(row.stripe_promotion_code_id, { active });
  await supabase.from("promo_codes").update({ active }).eq("id", id);
  revalidatePath("/admin/codes");
}
