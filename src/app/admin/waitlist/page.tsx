import { createServiceSupabase } from "@/lib/supabase/service";
import { getProfessions } from "@/lib/cms/read";
import { SITE_LAUNCHED } from "@/lib/launch";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Waitlist" };

const ROLE_LABEL: Record<string, string> = {
  rider: "Riders and owners",
  coach: "Riding coaches",
  horse_care: "Horse care professionals",
};

/** An ISO timestamp `n` days back, the same helper shape /admin/review uses. */
function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-4">
      <div className="font-display text-[34px] leading-none text-ink">{n}</div>
      <div className="mt-1 text-[13px] text-subtle">{label}</div>
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-1 text-[14px] text-subtle">None yet.</p>
      ) : (
        <ul className="mt-2 text-[14px]">
          {rows.map(([k, n]) => (
            <li key={k} className="flex justify-between border-b border-border py-1.5">
              <span className="text-fg">{k}</span>
              <span className="tabular-nums text-muted">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * /admin/waitlist: who signed up on the coming soon page, counted, and the
 * whole list as a CSV for the launch email.
 *
 * Counts on the page, addresses only in the download: a screen someone might
 * show to another person is the wrong place for a list of email addresses.
 * Read under the service role because the table is admin-read only and this
 * groups across every row.
 */
export default async function AdminWaitlistPage() {
  const service = createServiceSupabase();
  if (!service) {
    return <p className="text-[15px] text-muted">Supabase isn&apos;t connected, so there&apos;s no list to show.</p>;
  }

  const [{ data: rows }, professions] = await Promise.all([
    service.from("waitlist").select("role, profession_id, unsubscribed_at, created_at").order("created_at", { ascending: false }),
    getProfessions(),
  ]);
  const all = rows ?? [];
  const live = all.filter((r) => !r.unsubscribed_at);
  const week = daysAgo(7);

  const byRole = new Map<string, number>();
  const byProfession = new Map<string, number>();
  const professionName = new Map(professions.map((p) => [p.id ?? p.slug, p.name]));
  for (const r of live) {
    const role = String(r.role);
    byRole.set(role, (byRole.get(role) ?? 0) + 1);
    if (role === "horse_care") {
      const name = r.profession_id ? (professionName.get(String(r.profession_id)) ?? "Unknown") : "Didn't say";
      byProfession.set(name, (byProfession.get(name) ?? 0) + 1);
    }
  }
  const sorted = (m: Map<string, number>): [string, number][] => [...m.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Waitlist</h2>
        <p className="mt-2 text-[15px] leading-[1.5] text-muted">
          People who put their name down on the coming soon page.{" "}
          {SITE_LAUNCHED
            ? "The site has launched, so the page is no longer shown and no new names arrive."
            : "They have all agreed to one email when the site opens."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 wide:grid-cols-4">
        <Stat n={live.length} label="On the list" />
        <Stat n={live.filter((r) => String(r.created_at) >= week).length} label="Added this week" />
        <Stat n={all.length - live.length} label="Unsubscribed" />
        <Stat n={byRole.get("coach") ?? 0} label="Riding coaches" />
      </div>

      <div className="grid gap-6 wide:grid-cols-2">
        <Table title="Who they are" rows={sorted(byRole).map(([k, n]) => [ROLE_LABEL[k] ?? k, n])} />
        <Table title="Horse care professionals, by trade" rows={sorted(byProfession)} />
      </div>

      <div className="rounded-[14px] border border-border bg-surface p-4">
        <h3 className="text-[15px] font-semibold text-fg">Download the list</h3>
        <p className="mt-1 text-[14px] leading-[1.5] text-muted">
          Email address, who they are, what they do and when they signed up. Anyone who has unsubscribed is left out, so the file is safe to
          mail as it stands.
        </p>
        <LinkButton href="/admin/waitlist/export" variant="secondary" className="mt-3">
          Download CSV
        </LinkButton>
      </div>
    </div>
  );
}
