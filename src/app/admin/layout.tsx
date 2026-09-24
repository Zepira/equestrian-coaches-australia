import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

// Private, admin-only — never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const tabs = [
  { href: "/admin/review", label: "Review" },
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/disciplines", label: "Disciplines" },
  { href: "/admin/terms", label: "Terms" },
  { href: "/admin/aliases", label: "Aliases" },
  { href: "/admin/handbook", label: "Handbook" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  if (!supabase) redirect("/");

  // Defense in depth — the proxy already checked is_admin(), but RLS and
  // this check are what actually stop someone hitting the page directly.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");
  const { count: waiting } = await supabase.from("providers").select("id", { count: "exact", head: true }).eq("status", "in_review");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-[40px] leading-none -tracking-[0.02em] text-ink wide:text-[56px] wide:leading-[0.98]">Admin</h1>
      <p className="mt-2 text-[15px] leading-[1.5] text-muted">
        New profiles to review, invites, discipline pages, taxonomy, search aliases and settings. The Handbook tab holds the planning documents.
      </p>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-[14px] font-medium text-subtle hover:border-accent hover:text-ink"
          >
            {tab.label}
            {tab.href === "/admin/review" && (waiting ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-fg">{waiting}</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
