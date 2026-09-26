import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { profilePath } from "@/lib/page-paths";
import { isReviewRequired } from "@/lib/settings";
import { askForChanges, publishProvider } from "./actions";

export const metadata = { title: "Review" };

type Row = {
  id: string;
  slug: string;
  name: string;
  suburb: string;
  state: string;
  cohort: string;
  acquisition_source: string | null;
  submitted_at: string | null;
  review_note: string | null;
  status: string;
  provider_terms: { sort_order: number; terms: { name: string; kind: string } | null }[];
};

/** An ISO timestamp `n` days back, for the recent-changes window. */
function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

const when = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" }).format(new Date(iso)) : "";

/**
 * The review queue (The Site as a CMS §06.5, §10): profiles waiting, oldest
 * first. Publish (which emails them every page they now appear on) or ask
 * for changes with a note they see. Under it, the profiles waiting on the
 * provider, and recent name and photo changes to live profiles, which go
 * live without another review.
 */
export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { done, error } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const select = "id, slug, name, suburb, state, cohort, acquisition_source, submitted_at, review_note, status, provider_terms(sort_order, terms(name, kind))";
  const [{ data: waiting }, { data: asked }, { data: changes }, reviewOn] = await Promise.all([
    supabase.from("providers").select(select).eq("status", "in_review").order("submitted_at"),
    supabase.from("providers").select(select).eq("status", "changes_requested").order("reviewed_at", { ascending: false }).limit(20),
    supabase
      .from("provider_changes")
      .select("id, field, changed_at, providers(slug, name)")
      .gte("changed_at", daysAgo(30))
      .order("changed_at", { ascending: false })
      .limit(40),
    isReviewRequired(),
  ]);
  const profession = (r: Row) =>
    [...r.provider_terms].sort((a, b) => a.sort_order - b.sort_order).find((t) => t.terms?.kind === "profession")?.terms?.name ?? "No profession";

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="font-display text-[26px] leading-none text-ink">Waiting for a look</h2>
        <p className="mt-1 text-sm text-muted">
          Oldest first. {reviewOn ? "Review is on." : "Review is off in Settings, so new profiles publish themselves and this list stays empty."}
        </p>
        {done && <p className="mt-3 rounded-[12px] bg-accent-soft px-3 py-2 text-sm text-fg">{done === "published" ? "Published, and they've been emailed." : "Sent back with your note."}</p>}
        {error && <p className="mt-3 rounded-[12px] bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {(waiting ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nobody waiting.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {((waiting ?? []) as unknown as Row[]).map((r) => (
              <li key={r.id} className="rounded-[14px] border border-border bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-display text-[22px] leading-none text-ink">{r.name}</span>
                  <span className="text-xs text-muted">Sent {when(r.submitted_at)}</span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {profession(r)} · {r.suburb} {r.state} · {r.cohort}
                  {r.acquisition_source ? ` · from ${r.acquisition_source}` : ""}
                </p>
                <p className="mt-2 text-sm">
                  <Link href={`${profilePath(r.slug)}?preview=1`} target="_blank" className="font-medium text-accent">
                    Open the profile
                  </Link>
                </p>
                <div className="mt-3 flex flex-col gap-3 @[560px]/admin:flex-row @[560px]/admin:items-start">
                  <form action={publishProvider.bind(null, r.id)}>
                    <Button type="submit">Publish</Button>
                  </form>
                  <form action={askForChanges.bind(null, r.id)} className="flex min-w-0 flex-1 flex-col gap-2">
                    <textarea
                      name="note"
                      rows={2}
                      placeholder="What needs changing? They'll see exactly this."
                      className="w-full rounded-[12px] border border-border bg-surface px-3 py-2 text-sm text-fg"
                    />
                    <Button type="submit" variant="secondary" className="self-start">
                      Ask for changes
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[26px] leading-none text-ink">Waiting on them</h2>
        {(asked ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nobody.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {((asked ?? []) as unknown as Row[]).map((r) => (
              <li key={r.id} className="rounded-[12px] border border-border bg-surface px-3 py-2">
                <span className="font-medium text-fg">{r.name}</span> <span className="text-muted">({profession(r)})</span>: {r.review_note}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[26px] leading-none text-ink">Recent changes to live profiles</h2>
        <p className="mt-1 text-sm text-muted">Names and photos, last 30 days. These went live without a review.</p>
        {(changes ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">None.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {(changes ?? []).map((c) => {
              const p = (c as unknown as { providers: { slug: string; name: string } | null }).providers;
              return (
                <li key={c.id} className="flex flex-wrap justify-between gap-2 rounded-[12px] border border-border bg-surface px-3 py-2">
                  <span>
                    {p ? (
                      <Link href={profilePath(p.slug)} className="font-medium text-accent">
                        {p.name}
                      </Link>
                    ) : (
                      "A provider"
                    )}{" "}
                    {c.field}
                  </span>
                  <span className="text-xs text-muted">{when(c.changed_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
