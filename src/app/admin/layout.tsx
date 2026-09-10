import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

// Private, admin-only — never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const tabs = [
  { href: "/admin/terms", label: "Terms" },
  { href: "/admin/aliases", label: "Aliases" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  if (!supabase) redirect("/");

  // Defense in depth — the proxy already checked is_admin(), but RLS and
  // this check are what actually stop someone hitting the page directly.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-[40px] leading-none -tracking-[0.02em] text-ink wide:text-[56px] wide:leading-[0.98]">Admin</h1>
      <p className="mt-2 text-[15px] leading-[1.5] text-muted">
        Taxonomy management — see CLAUDE.md for how the alias pipeline is meant to feed this.
      </p>

      <nav className="mt-6 flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-[14px] font-medium text-subtle hover:border-accent hover:text-ink"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
