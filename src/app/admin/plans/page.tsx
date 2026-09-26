import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { whoNames } from "@/lib/admin";
import { DEFAULTS, readPlanCapability, readPlanInfo, readStripePrices, type SettingKey } from "@/lib/settings";
import { isStripeConfigured } from "@/lib/stripe";
import { DEFAULT_CAPABILITIES, DEFAULT_PLANS, LIVE_PLAN_STATUSES, TIERS } from "@/lib/tiers";
import { HistoryList } from "../history-list";
import { savePlanCapabilities, savePlansAndPrices } from "../settings/actions";

export const metadata = { title: "Plans and prices" };

/**
 * Stripe's domestic card rate from 1 October 2026 (1.7% + $0.30). Not ours
 * to set, so not a setting; it's here only to show what a price leaves after
 * fees, and the RBA surcharge ban means it can't be passed on.
 */
const STRIPE_RATE = 0.017;
const STRIPE_FIXED = 0.3;
const net = (price: string) => {
  const p = Number(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(p) && p > 0 ? `$${(p - p * STRIPE_RATE - STRIPE_FIXED).toFixed(2)}` : "";
};

const KEYS: SettingKey[] = ["plans", "founding_price", "stripe_prices", "plan_capabilities"];
const KEY_NAMES: Record<string, string> = { plans: "Plans and prices", founding_price: "Founding price", stripe_prices: "Stripe prices", plan_capabilities: "What plans include" };

/**
 * /admin/plans (§09, §10): the three plans every profession shares, each
 * display price beside the Stripe Price that charges it, the founding price,
 * and what each plan unlocks. A price change only ever applies to new
 * subscriptions: Stripe keeps existing subscribers on the Price they signed
 * up to, which is also what makes the founding rate stick.
 */
export default async function AdminPlansPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const service = createServiceSupabase();

  const [{ data: rows }, { data: history }, subs] = await Promise.all([
    supabase.from("settings").select("key, value").in("key", KEYS),
    supabase.from("settings_history").select("key, changed_by, changed_at").in("key", KEYS).order("changed_at", { ascending: false }).limit(20),
    service ? service.from("subscriptions").select("tier, founding, status").in("status", [...LIVE_PLAN_STATUSES, "past_due"]) : Promise.resolve({ data: [] }),
  ]);
  const stored = (key: SettingKey) => rows?.find((r) => r.key === key)?.value ?? DEFAULTS[key];
  const parse = (key: SettingKey) => {
    try {
      return JSON.parse(stored(key));
    } catch {
      return {};
    }
  };
  const plans = TIERS.map((t) => ({ tier: t, ...(readPlanInfo(parse("plans")[t]) ?? DEFAULT_PLANS[t]) }));
  const caps = TIERS.map((t) => ({ tier: t, ...(readPlanCapability(parse("plan_capabilities")[t], DEFAULT_CAPABILITIES[t]) ?? DEFAULT_CAPABILITIES[t]) }));
  const ids = readStripePrices(parse("stripe_prices")) ?? readStripePrices(JSON.parse(DEFAULTS.stripe_prices))!;
  const foundingPrice = stored("founding_price");
  const subRows = (subs.data ?? []) as { tier: string | null; founding: boolean }[];
  const onTier = (t: string) => subRows.filter((s) => s.tier === t && !s.founding).length;
  const founding = subRows.filter((s) => s.founding).length;
  const names = await whoNames(supabase, (history ?? []).map((h) => h.changed_by));
  const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[15px] text-fg";
  const idInput = `${input} font-mono text-[13px]`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Plans and prices</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          One set of plans for every profession (a profession can rename a plan on its own tab). Each price shown on the site sits beside the Stripe price that charges it.{" "}
          {isStripeConfigured
            ? "Saving checks every one against Stripe, and refuses if the amount, currency or interval doesn't match."
            : "Payments are in test mode, so the Stripe IDs are kept as typed. They're checked against Stripe the first time you save here after it's connected."}
        </p>
      </div>
      {saved && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">Saved. The site shows it now.</p>}
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}

      <form action={savePlansAndPrices} className="flex flex-col gap-4">
        {plans.map((p) => {
          const n = onTier(p.tier);
          return (
            <fieldset key={p.tier} className="grid gap-3 rounded-[16px] border border-border bg-surface p-4 @[560px]/admin:grid-cols-2" data-plan={p.tier}>
              <legend className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-subtle">{p.tier}</legend>
              <label className="block">
                <span className="mb-1 block text-[14px] font-medium text-fg">Name</span>
                <input name={`${p.tier}.name`} required maxLength={30} defaultValue={p.name} className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[14px] font-medium text-fg">Tagline</span>
                <input name={`${p.tier}.tagline`} required maxLength={80} defaultValue={p.tagline} className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[14px] font-medium text-fg">Monthly price shown</span>
                <input name={`${p.tier}.monthly`} required defaultValue={p.monthly} className={input} />
                <span className="mt-1 block text-[12px] text-subtle">You keep about {net(p.monthly)} after Stripe&rsquo;s fee.</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-[14px] font-medium text-fg">Its Stripe price</span>
                <input name={`${p.tier}.monthly_id`} defaultValue={ids[p.tier].monthly} placeholder="price_…" className={idInput} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[14px] font-medium text-fg">Yearly price shown</span>
                <input name={`${p.tier}.yearly`} required defaultValue={p.yearly} className={input} />
                <span className="mt-1 block text-[12px] text-subtle">You keep about {net(p.yearly)} after Stripe&rsquo;s fee.</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-[14px] font-medium text-fg">Its Stripe price</span>
                <input name={`${p.tier}.yearly_id`} defaultValue={ids[p.tier].yearly} placeholder="price_… (when yearly is sold)" className={idInput} />
              </label>
              <p className="text-[13px] text-muted @[560px]/admin:col-span-2">
                A new price applies to new subscriptions only. {n === 0 ? "Nobody is on this plan yet." : `${n} ${n === 1 ? "person stays" : "people stay"} on what they pay now.`}
              </p>
            </fieldset>
          );
        })}
        <fieldset className="grid gap-3 rounded-[16px] border border-border bg-surface p-4 @[560px]/admin:grid-cols-2" data-plan="founding">
          <legend className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-subtle">Founding</legend>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Founding price, monthly</span>
            <input name="founding.price" required defaultValue={foundingPrice} className={input} />
            <span className="mt-1 block text-[12px] text-subtle">What founding members pay after their free period, for as long as they stay. You keep about {net(foundingPrice)}.</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Its Stripe price</span>
            <input name="founding.id" defaultValue={ids.founding} placeholder="price_…" className={idInput} />
            <span className="mt-1 block text-[12px] text-subtle">A separate Stripe price from the open {plans[0].name} one, so a rise for new members never reaches founding ones.</span>
          </label>
          <p className="text-[13px] text-muted @[560px]/admin:col-span-2">
            {founding === 0 ? "No founding members yet." : `${founding} founding ${founding === 1 ? "member" : "members"}.`} The free months and join-by date are on the Settings tab.
          </p>
        </fieldset>
        <div>
          <Button type="submit">Save plans and prices</Button>
        </div>
      </form>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[22px] leading-none text-ink">What each plan includes</h2>
        <p className="mt-1 max-w-[62ch] text-[14px] text-muted">
          How many live events a plan can have at once (empty for no limit), whether it can add an intro video, whether it takes turns in the featured spots, and whether the dashboard compares them with others in their profession.
        </p>
        <form action={savePlanCapabilities} className="mt-4 flex flex-col gap-3">
          {caps.map((c) => (
            <div key={c.tier} className="flex flex-wrap items-end gap-4 rounded-[14px] border border-border bg-surface p-4">
              <span className="w-24 text-[14px] font-medium text-fg">{plans.find((p) => p.tier === c.tier)?.name}</span>
              <label className="block">
                <span className="mb-1 block text-[14px] font-medium text-fg">Live events</span>
                <input type="number" name={`${c.tier}.event_limit`} min={0} max={100} defaultValue={c.eventLimit ?? ""} placeholder="No limit" className={`${input} w-32`} />
              </label>
              <label className="flex items-center gap-2 pb-2.5 text-[14px] text-fg"><input type="checkbox" name={`${c.tier}.video`} defaultChecked={c.video} /> Intro video</label>
              <label className="flex items-center gap-2 pb-2.5 text-[14px] text-fg"><input type="checkbox" name={`${c.tier}.featured`} defaultChecked={c.featured} /> Featured spot</label>
              <label className="flex items-center gap-2 pb-2.5 text-[14px] text-fg"><input type="checkbox" name={`${c.tier}.benchmarks`} defaultChecked={c.benchmarks} /> Benchmarks</label>
            </div>
          ))}
          <div>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </section>

      <HistoryList rows={(history ?? []).map((h) => ({ when: h.changed_at, who: names.get(h.changed_by) ?? null, what: `Changed ${KEY_NAMES[h.key] ?? h.key}` }))} />
    </div>
  );
}
