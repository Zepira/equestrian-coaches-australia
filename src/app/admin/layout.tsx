import { AdminNav } from "./admin-nav";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

// Private, admin-only — never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  if (!supabase) redirect("/");

  // Defense in depth — the proxy already checked is_admin(), but RLS and
  // this check are what actually stop someone hitting the page directly.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");
  const { count: waiting } = await supabase.from("providers").select("id", { count: "exact", head: true }).eq("status", "in_review");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-[40px] leading-none -tracking-[0.02em] text-ink wide:text-[56px] wide:leading-[0.98]">Admin</h1>
      <p className="mt-2 text-[15px] leading-[1.5] text-muted">
        Everything the site lists, says and charges, and who is on it. A save is live straight away, and each screen keeps a history of who changed what.
      </p>

      <AdminNav waiting={waiting ?? 0} />

      <div className="mt-6">{children}</div>
    </div>
  );
}
