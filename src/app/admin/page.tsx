import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_GROUPS } from "./sections";

/**
 * The admin front page: what is waiting on someone, then every screen with a
 * line on what it's for. It used to redirect straight to the review queue,
 * which left the other 25 screens to be found by guessing at their names.
 */
export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const head = { count: "exact", head: true } as const;
  const [profiles, reviews, reports] = supabase
    ? (
        await Promise.all([
          supabase.from("providers").select("id", head).eq("status", "in_review"),
          supabase.from("reviews").select("id", head).eq("status", "pending"),
          supabase.from("review_reports").select("id", head).is("resolved_at", null),
        ])
      ).map((r) => r.count ?? 0)
    : [0, 0, 0];

  const todo = [
    { n: profiles, one: "new profile to check", many: "new profiles to check", href: "/admin/review" },
    { n: reviews, one: "rider review to publish", many: "rider reviews to publish", href: "/admin/reviews" },
    { n: reports, one: "reported review", many: "reported reviews", href: "/admin/reviews" },
  ].filter((t) => t.n > 0);

  return (
    <div>
      <h2 className="admin-title">Overview</h2>

      <section className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h3 className="admin-section">Waiting on you</h3>
        {todo.length === 0 ? (
          <p className="mt-2 text-[14.5px] text-muted">Nothing right now.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {todo.map((t) => (
              <li key={t.one}>
                <Link href={t.href} className="group flex items-center gap-3 text-[15px] text-ink">
                  <span className="min-w-[2.25rem] rounded-[var(--radius-pill)] bg-accent px-2 py-1 text-center text-[13px] font-semibold leading-none text-accent-fg">{t.n}</span>
                  <span className="group-hover:underline">{t.n === 1 ? t.one : t.many}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 grid gap-5 @[640px]/admin:grid-cols-2">
        {ADMIN_GROUPS.map((g) => (
          <section key={g.id} className="rounded-[var(--radius-card)] border border-border p-5">
            <h3 className="admin-section">{g.name}</h3>
            <p className="mt-1 text-[13.5px] text-subtle">{g.blurb}</p>
            <ul className="mt-4 flex flex-col gap-3">
              {g.sections.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="group block">
                    <span className="text-[15px] font-semibold text-ink group-hover:text-accent">{s.label}</span>
                    <span className="mt-0.5 block text-[13.5px] leading-[1.45] text-muted">{s.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
