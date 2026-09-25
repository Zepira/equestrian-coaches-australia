"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The admin tabs, grouped the way the site is (The Site as a CMS §10): what
 * it lists, what it says, what it charges, and who is on it.
 */
const GROUPS: { name: string; tabs: { href: string; label: string }[] }[] = [
  {
    name: "Who",
    tabs: [
      { href: "/admin/review", label: "Review" },
      { href: "/admin/providers", label: "Providers" },
      { href: "/admin/invites", label: "Invites" },
      { href: "/admin/riders", label: "Riders" },
    ],
  },
  {
    name: "Lists",
    tabs: [
      { href: "/admin/professions", label: "Professions" },
      { href: "/admin/disciplines", label: "Specialities" },
      { href: "/admin/terms", label: "Terms" },
      { href: "/admin/aliases", label: "Aliases" },
      { href: "/admin/areas", label: "Areas" },
    ],
  },
  {
    name: "Says",
    tabs: [
      { href: "/admin/pages", label: "Pages" },
      { href: "/admin/emails", label: "Emails" },
    ],
  },
  {
    name: "Grow",
    tabs: [
      { href: "/admin/audience", label: "Audience" },
      { href: "/admin/links", label: "Links and sources" },
      { href: "/admin/on-site", label: "On the site" },
    ],
  },
  {
    name: "Charges",
    tabs: [
      { href: "/admin/plans", label: "Plans and prices" },
      { href: "/admin/settings", label: "Settings" },
    ],
  },
  { name: "Notes", tabs: [{ href: "/admin/handbook", label: "Handbook" }] },
];

export function AdminNav({ waiting }: { waiting: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="mt-6 flex gap-x-6 gap-y-3 overflow-x-auto border-b border-border sm:flex-wrap sm:overflow-visible">
      {GROUPS.map((g) => (
        <div key={g.name} className="flex shrink-0 flex-col">
          <span className="px-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-subtle">{g.name}</span>
          <div className="flex">
            {g.tabs.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-medium hover:text-ink ${active ? "border-accent text-ink" : "border-transparent text-subtle hover:border-border"}`}
                >
                  {tab.label}
                  {tab.href === "/admin/review" && waiting > 0 && (
                    <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-fg">{waiting}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
