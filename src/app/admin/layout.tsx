import { AdminNav } from "./admin-nav";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

// Private, admin-only — never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin shell. The sections live in a rail down the left from 900px (see
 * AdminNav) and the page fills the rest, which is the readability change:
 * the old wrapped tab bar spent the top of every screen on 24 links and then
 * squeezed dense tables into 1024px. Breakpoints are written in px because
 * Tailwind v4 cannot order a px breakpoint against the default rem ones.
 *
 * The content column is a **container**, and every screen inside it lays out
 * against the column rather than the window (`@[560px]/admin:` and friends).
 * The rail is what makes that necessary: at 899px there is no rail and the
 * column is 851px wide; at 900px the rail appears and the column drops to
 * 572px, so widening the window by one pixel takes 279px off the content.
 * A window-keyed `sm:grid-cols-3` fired at 640px and stayed on, putting three
 * fields into 190px each right at the point the rail arrived. The container
 * asks the only question that matters: how wide is this column.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  if (!supabase) redirect("/");

  // Defense in depth — the proxy already checked is_admin(), but RLS and
  // this check are what actually stop someone hitting the page directly.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");
  const { count: waiting } = await supabase.from("providers").select("id", { count: "exact", head: true }).eq("status", "in_review");

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-6 min-[640px]:px-6 min-[900px]:grid min-[900px]:grid-cols-[224px_minmax(0,1fr)] min-[900px]:items-start min-[900px]:gap-10 min-[900px]:px-8 min-[900px]:py-9 min-[1200px]:gap-14">
      <AdminNav waiting={waiting ?? 0} />
      <div className="@container/admin min-w-0 pt-6 min-[900px]:pt-0">{children}</div>
    </div>
  );
}
