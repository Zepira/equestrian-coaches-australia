"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * The admin sections, grouped the way the site is (The Site as a CMS §10):
 * what it lists, what it says, what it charges, and who is on it.
 */
const GROUPS: { name: string; tabs: { href: string; label: string }[] }[] = [
  {
    name: "Who",
    tabs: [
      { href: "/admin/review", label: "Review" },
      { href: "/admin/providers", label: "Providers" },
      { href: "/admin/invites", label: "Invites" },
      { href: "/admin/riders", label: "Riders" },
      { href: "/admin/waitlist", label: "Waitlist" },
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
      { href: "/admin/codes", label: "Codes and referrals" },
      { href: "/admin/reviews", label: "Reviews" },
      { href: "/admin/sequences", label: "Sequences" },
      { href: "/admin/campaigns", label: "Campaigns" },
      { href: "/admin/guides", label: "Guides" },
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

/**
 * Admin navigation. From 900px it is a sticky rail down the left, which is
 * the only shape 24 sections read in — as one wrapped tab bar they were a
 * wall of words with no way to tell a group from a row. Narrower than that
 * the rail collapses to a button showing where you are, because a rail plus
 * a dense table does not fit a phone.
 *
 * The rail scrolls itself rather than growing past the viewport: 24 items is
 * taller than a laptop screen, and a sticky element taller than the viewport
 * strands its last items until you reach the bottom of the page.
 *
 * The sticky offset clears the site header, which is sticky itself on admin
 * routes, so the rail's own top is --header-h down the page rather than 0.
 *
 * Breakpoints here are all written in px on purpose. Tailwind v4 cannot order
 * a px breakpoint against the default rem ones, so mixing `sm:` and
 * `min-[900px]:` on one property silently applies the wrong one.
 */
export function AdminNav({ waiting }: { waiting: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const here = GROUPS.flatMap((g) => g.tabs.map((t) => ({ ...t, group: g.name }))).find((t) => isActive(t.href));

  const badge = (href: string) =>
    href === "/admin/review" && waiting > 0 ? (
      <span className="ml-auto rounded-[var(--radius-pill)] bg-accent px-1.5 py-[3px] text-[11px] font-semibold leading-none text-accent-fg">{waiting}</span>
    ) : null;

  const groupList = (
    <>
      {GROUPS.map((g) => (
        <div key={g.name} className="mt-4 first:mt-0">
          <p className="px-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-subtle">{g.name}</p>
          <div className="mt-1 flex flex-col gap-0.5">
            {g.tabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-[var(--radius-soft)] px-3 py-[7px] text-[14.5px] font-medium transition-colors duration-150 ${
                    active ? "bg-shade text-ink" : "text-muted hover:bg-shade/60 hover:text-ink"
                  }`}
                >
                  {tab.label}
                  {badge(tab.href)}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="min-[900px]:sticky min-[900px]:top-[calc(var(--header-h)_+_1.5rem)] min-[900px]:max-h-[calc(100dvh_-_var(--header-h)_-_3rem)] min-[900px]:overflow-y-auto min-[900px]:overscroll-contain min-[900px]:pr-1">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-3 min-[900px]:block min-[900px]:border-0 min-[900px]:pb-0">
        <div>
          <h1 className="font-display text-[28px] leading-none -tracking-[0.01em] text-ink min-[900px]:text-[34px]">Admin</h1>
          <p className="mt-1.5 text-[13px] leading-[1.4] text-subtle min-[900px]:hidden">{here ? `${here.group} · ${here.label}` : "Pick a section"}</p>
          <p className="mt-2 hidden text-[13px] leading-[1.45] text-subtle min-[900px]:block">A save goes live straight away, and each screen keeps a history of who changed what.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-sections"
          className="shrink-0 rounded-[var(--radius-pill)] border border-border bg-surface px-3.5 py-2 text-[13.5px] font-medium text-ink min-[900px]:hidden"
        >
          {open ? "Close" : "Sections"}
          {!open && waiting > 0 && <span className="ml-1.5 rounded-[var(--radius-pill)] bg-accent px-1.5 py-[2px] text-[11px] font-semibold text-accent-fg">{waiting}</span>}
        </button>
      </div>

      <nav
        id="admin-sections"
        aria-label="Admin"
        className={`mt-4 min-[900px]:mt-6 min-[900px]:block ${open ? "block" : "hidden"}`}
      >
        {groupList}
      </nav>
    </div>
  );
}
