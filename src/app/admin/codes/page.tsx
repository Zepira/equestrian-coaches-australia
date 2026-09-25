import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { changeLog } from "@/lib/admin";
import { DEFAULTS, SETTING_RANGES } from "@/lib/settings";
import { isStripeConfigured } from "@/lib/stripe";
import { HistoryList } from "../history-list";
import { saveSetting } from "../settings/actions";
import { createPromo, setPromoActive } from "./actions";

export const metadata = { title: "Codes and referrals" };

const STATUS: Record<string, string> = { joined: "Joined", paid: "Paying, reward waiting", rewarded: "Rewarded", capped: "Paying, over the yearly limit" };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Melbourne" });

/**
 * /admin/codes (The Marketing Engine M6): partner promo codes over Stripe,
 * with their redemptions, and every referral with where it's up to. The
 * referral reward, yearly limit and the referee's coupon are settings.
 */
export default async function AdminCodesPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string; saved?: string }> }) {
  const { done, error, saved } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const [{ data: codes }, { data: uses }, { data: referrals }, { data: settingRows }, history] = await Promise.all([
    supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
    supabase.from("promo_redemptions").select("promo_id"),
    supabase.from("referrals").select("status, created_at, rewarded_at, code, referrer:providers!referrals_referrer_provider_id_fkey(name), referee:providers!referrals_referee_provider_id_fkey(name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("settings").select("key, value").in("key", ["referral_reward_months", "referral_cap_per_year", "referral_coupon_id"]),
    changeLog(supabase, { table: "promo_codes" }),
  ]);
  const used = (id: string) => (uses ?? []).filter((u) => u.promo_id === id).length;
  const setting = (k: "referral_reward_months" | "referral_cap_per_year" | "referral_coupon_id") => settingRows?.find((r) => r.key === k)?.value ?? DEFAULTS[k];
  const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Codes and referrals</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          Partner codes (Pony Club members get three months of Spotlight, say) and colleague referrals. {isStripeConfigured ? "Codes are made in Stripe too, and Stripe applies them at checkout." : "Payments are in test mode, so codes are kept here and made in Stripe once it's connected."}
        </p>
      </div>
      {done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{done}</p>}
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}
      {saved && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">Saved.</p>}

      <section className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
        <h3 className="font-display text-[20px] leading-none text-ink">Make a code</h3>
        <form action={createPromo} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">Code</span><input name="code" required placeholder="PONYCLUB" className={`${input} uppercase`} /></label>
          <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">Who it&rsquo;s for</span><input name="description" required placeholder="Pony Club members, three months of Spotlight" className={input} /></label>
          <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">Percent off</span><input name="percent_off" type="number" min={1} max={100} defaultValue={100} className={input} /></label>
          <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">For how many months</span><input name="duration_months" type="number" min={1} max={24} defaultValue={3} className={input} /></label>
          <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">Most uses (empty for no limit)</span><input name="max_redemptions" type="number" min={1} className={input} /></label>
          <label className="block"><span className="mb-1 block text-[14px] font-medium text-fg">Last day to use it (optional)</span><input name="expires_on" type="date" className={input} /></label>
          <label className="flex items-center gap-2 text-[14px] sm:col-span-2"><input type="checkbox" name="first_time_only" defaultChecked /> New subscriptions only</label>
          <div className="sm:col-span-2"><Button type="submit">Make the code</Button></div>
        </form>
      </section>

      <section>
        <h3 className="font-display text-[20px] leading-none text-ink">Codes</h3>
        <ul className="mt-3 flex flex-col gap-2 text-[14px]" data-codes>
          {(codes ?? []).map((c) => (
            <li key={c.id} className={`flex flex-col gap-1 rounded-[12px] border border-border bg-surface px-3 py-2.5 sm:flex-row sm:items-center ${c.active ? "" : "opacity-55"}`} data-code={c.code}>
              <div className="min-w-0 flex-1">
                <span className="font-mono font-medium text-fg">{c.code}</span> <span className="text-muted">· {c.description}</span>
                <div className="text-[12.5px] text-subtle">
                  {c.percent_off}% off for {c.duration_months} month{c.duration_months === 1 ? "" : "s"}
                  {c.max_redemptions ? ` · up to ${c.max_redemptions} uses` : ""}
                  {c.expires_on ? ` · until ${day(c.expires_on)}` : ""}
                  {c.first_time_only ? " · new subscriptions only" : ""}
                  {c.stripe_promotion_code_id ? " · in Stripe" : " · not in Stripe yet"}
                </div>
              </div>
              <span className="text-[13px] text-muted">{used(c.id)} used</span>
              <form action={setPromoActive.bind(null, c.id, !c.active)}>
                <button className="text-[13px] text-subtle hover:text-fg">{c.active ? "Stop it" : "Start it again"}</button>
              </form>
            </li>
          ))}
          {(codes ?? []).length === 0 && <li className="text-subtle">None yet.</li>}
        </ul>
      </section>

      <section className="border-t border-border pt-6">
        <h3 className="font-display text-[20px] leading-none text-ink">Referrals</h3>
        <p className="mt-1.5 max-w-[66ch] text-[13px] text-subtle">
          Every professional has a code on their Promote tab. A colleague who joins with it gets their first month free (the Stripe coupon below); when they first pay, the referrer gets free months as credit, up to the yearly limit.
        </p>
        <div className="mt-3 flex flex-wrap gap-4">
          {(
            [
              ["referral_reward_months", "Months the referrer earns", "number"],
              ["referral_cap_per_year", "Most rewards a year, each", "number"],
              ["referral_coupon_id", "Stripe coupon for the colleague's free month", "text"],
            ] as const
          ).map(([k, l, t]) => (
            <form key={k} action={saveSetting} className="flex items-end gap-2">
              <input type="hidden" name="key" value={k} />
              <input type="hidden" name="back" value="/admin/codes" />
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-fg">{l}</span>
                <input name="value" type={t} defaultValue={setting(k)} {...(t === "number" ? { min: SETTING_RANGES[k as "referral_reward_months"][0], max: SETTING_RANGES[k as "referral_reward_months"][1] } : {})} className={`${input} ${t === "number" ? "w-24" : "w-64"}`} />
              </label>
              <Button type="submit" variant="secondary">Save</Button>
            </form>
          ))}
        </div>
        <ul className="mt-4 text-[14px]" data-referral-list>
          {(referrals ?? []).map((r, i) => {
            const x = r as unknown as { referrer: { name: string } | null; referee: { name: string } | null };
            return (
              <li key={i} className="flex flex-wrap justify-between gap-2 border-b border-border py-1.5">
                <span className="text-fg">{x.referrer?.name ?? "?"} referred {x.referee?.name ?? "?"}</span>
                <span className="text-subtle">{STATUS[r.status] ?? r.status} · {day(r.created_at)}</span>
              </li>
            );
          })}
          {(referrals ?? []).length === 0 && <li className="text-subtle">None yet.</li>}
        </ul>
      </section>

      <HistoryList rows={history} />
    </div>
  );
}
