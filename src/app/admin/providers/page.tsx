import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPlans } from "@/lib/settings";
import { isTier } from "@/lib/tiers";
import { whoNames } from "@/lib/admin";
import { profilePath } from "@/lib/page-paths";
import { HistoryList } from "../history-list";
import { setProviderHidden, setRegistrationChecked } from "./actions";

export const metadata = { title: "Providers" };

type Row = {
  id: string;
  slug: string;
  name: string;
  suburb: string;
  state: string;
  status: string;
  cohort: string;
  acquisition_source: string | null;
  hidden_by_admin: boolean;
  created_at: string;
  registration_number: string;
  registration_checked_at: string | null;
  specialist_checked: boolean;
  provider_terms: { sort_order: number; terms: { slug: string; name: string; kind: string } | null }[];
  subscriptions: { tier: string | null; status: string } | { tier: string | null; status: string }[] | null;
};

const STATUS: Record<string, string> = {
  draft: "Building their profile",
  in_review: "Waiting for review",
  changes_requested: "Changes asked for",
  published: "Live",
  hidden: "Hidden",
};
const day = (iso: string) => new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Melbourne" }).format(new Date(iso));

/**
 * /admin/providers (§10): everyone with a profile, filtered by name,
 * profession, status and cohort, with where they came from and their plan.
 * Hide takes a profile off the site at once and keeps it off until you show
 * it again, whatever their plan does. Recent changes to live profiles are
 * underneath.
 */
export default async function AdminProvidersPage({ searchParams }: { searchParams: Promise<{ q?: string; p?: string; status?: string; cohort?: string }> }) {
  const { q = "", p = "", status = "", cohort = "" } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;

  let query = supabase
    .from("providers")
    .select("id, slug, name, suburb, state, status, cohort, acquisition_source, hidden_by_admin, created_at, registration_number, registration_checked_at, specialist_checked, provider_terms(sort_order, terms(slug, name, kind)), subscriptions(tier, status)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (q.trim()) query = query.or(`name.ilike.%${q.trim().replace(/[%,()]/g, "")}%,slug.ilike.%${q.trim().replace(/[%,()]/g, "")}%`);
  if (status && STATUS[status]) query = query.eq("status", status);
  if (cohort === "founding" || cohort === "open") query = query.eq("cohort", cohort);

  const [{ data }, { data: profs }, plans, { data: changes }] = await Promise.all([
    query,
    supabase.from("terms").select("slug, name").eq("kind", "profession").order("sort_order"),
    getPlans(),
    supabase.from("provider_changes").select("field, old_value, new_value, changed_by, changed_at, providers(name)").order("changed_at", { ascending: false }).limit(25),
  ]);
  const professionsOf = (r: Row) =>
    [...r.provider_terms].sort((a, b) => a.sort_order - b.sort_order).filter((t) => t.terms?.kind === "profession").map((t) => t.terms!);
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => !p || professionsOf(r).some((t) => t.slug === p));
  const names = await whoNames(supabase, (changes ?? []).map((c) => c.changed_by));
  const input = "rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Providers</h2>
        <p className="mt-1.5 text-[14px] text-muted">
          Everyone with a profile. Profiles waiting for a look are on the <Link href="/admin/review" className="text-accent underline-offset-2 hover:underline">Review</Link> tab.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2" role="search">
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Name
          <input name="q" defaultValue={q} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Profession
          <select name="p" defaultValue={p} className={input}>
            <option value="">All</option>
            {(profs ?? []).map((x) => (
              <option key={x.slug} value={x.slug}>{x.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Status
          <select name="status" defaultValue={status} className={input}>
            <option value="">All</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Cohort
          <select name="cohort" defaultValue={cohort} className={input}>
            <option value="">Both</option>
            <option value="founding">Founding</option>
            <option value="open">Open</option>
          </select>
        </label>
        <button className="rounded-[var(--radius-pill)] bg-ink px-4 py-2 text-[14px] font-medium text-ink-fg">Show</button>
      </form>

      <p className="text-[13px] text-subtle" data-count>{rows.length} {rows.length === 1 ? "profile" : "profiles"}</p>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const sub = Array.isArray(r.subscriptions) ? r.subscriptions[0] : r.subscriptions;
          const plan = sub && isTier(sub.tier) ? `${plans[sub.tier].name} (${sub.status.replace("_", " ")})` : "No plan";
          const profs = professionsOf(r);
          return (
            <li key={r.id} className="flex flex-col gap-2 rounded-[14px] border border-border bg-surface p-3 @[560px]/admin:flex-row @[560px]/admin:items-center" data-provider={r.slug}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-[19px] leading-none text-ink">{r.name}</span>
                  <span className="text-[13px] text-muted">{profs.map((t) => t.name).join(", ") || "No profession"}</span>
                  {r.suburb && <span className="text-[13px] text-subtle">· {r.suburb} {r.state}</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[12px] text-subtle">
                  <span className={r.status === "published" ? "text-success" : ""}>{STATUS[r.status] ?? r.status}{r.hidden_by_admin ? " by you" : ""}</span>
                  <span>{plan}</span>
                  <span>{r.cohort === "founding" ? "Founding" : "Open"}</span>
                  <span>From {r.acquisition_source || "the site"}</span>
                  <span>Joined {day(r.created_at)}</span>
                </div>
                {r.registration_number && (
                  <form action={setRegistrationChecked.bind(null, r.id)} className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg" data-registration>
                    <span>Registration {r.registration_number}</span>
                    <label className="flex items-center gap-1.5"><input type="checkbox" name="checked" defaultChecked={Boolean(r.registration_checked_at)} /> Checked on the public register</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" name="specialist" defaultChecked={r.specialist_checked} /> Specialist registration</label>
                    <button className="font-medium text-accent">Save</button>
                    {r.registration_checked_at && <span className="text-subtle">checked {day(r.registration_checked_at)}</span>}
                  </form>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-[14px]">
                <Link href={`${profilePath(r.slug)}${r.status === "published" ? "" : "?preview=1"}`} target="_blank" className="text-subtle hover:text-fg">View</Link>
                {(r.status === "published" || r.hidden_by_admin) && (
                  <form action={setProviderHidden.bind(null, r.id, !r.hidden_by_admin)}>
                    <button className={r.hidden_by_admin ? "font-medium text-accent" : "text-danger"}>{r.hidden_by_admin ? "Show again" : "Hide"}</button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <HistoryList
        rows={(changes ?? []).map((c) => ({
          when: c.changed_at,
          who: names.get(c.changed_by) ?? null,
          what: `${(c.providers as unknown as { name: string } | null)?.name ?? "A profile"}: ${c.field}`,
          detail: c.field.includes("admin") ? undefined : [c.old_value, c.new_value].filter(Boolean).join(" → ").slice(0, 120) || undefined,
        }))}
        empty="No changes to live profiles yet."
      />
    </div>
  );
}
