import Link from "next/link";
import { PAGES } from "@/lib/cms/registry";
import { createClient } from "@/lib/supabase/server";
import { whoNames } from "@/lib/admin";
import { HistoryList } from "../history-list";

export const metadata = { title: "Pages" };

/** /admin/pages: every page whose words are edited here, one form each. */
export default async function AdminPagesPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const keys = [...new Set(PAGES.flatMap((p) => p.keys))];
  const { data } = await supabase
    .from("content_history")
    .select("key, changed_by, changed_at")
    .in("key", keys)
    .order("changed_at", { ascending: false })
    .limit(20);
  const names = await whoNames(supabase, (data ?? []).map((r) => r.changed_by));
  const pageOf = (key: string) => PAGES.find((p) => p.keys.includes(key as never))?.name ?? key;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Pages</h2>
        <p className="mt-1.5 text-[14px] text-muted">
          The words on each page. A save is live straight away. Profession pages (each door&rsquo;s sections, pitches and questions) are on the Professions tab, and discipline pages on Specialities.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {PAGES.map((p) => (
          <li key={p.slug}>
            <Link href={`/admin/pages/${p.slug}`} className="flex h-full flex-col rounded-[14px] border border-border bg-surface p-4 hover:border-accent">
              <span className="font-display text-[20px] leading-none text-ink">{p.name}</span>
              <span className="mt-1.5 text-[13px] text-subtle">{p.href === "/search" ? "Every profile" : p.href}</span>
            </Link>
          </li>
        ))}
      </ul>
      <HistoryList
        rows={(data ?? []).map((r) => ({ when: r.changed_at, who: names.get(r.changed_by) ?? null, what: `Changed ${pageOf(r.key)}`, detail: r.key }))}
      />
    </div>
  );
}
