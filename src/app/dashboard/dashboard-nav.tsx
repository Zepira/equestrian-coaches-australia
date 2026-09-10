"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/enquiries", label: "Enquiries" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/clinics", label: "Clinics" },
  { href: "/dashboard/billing", label: "Billing" },
];

/**
 * Dashboard navigation (canvas: Dashboards 1a/1b). Phones: a horizontal
 * tab row under the header with a terracotta underline on the active tab;
 * desktop: a 200px sticky rail with the plan card and the "tell Kim or
 * Alana" note. Tabs are real routes, so deep links and back/forward work.
 */
export function DashboardNav({
  newEnquiries,
  planName,
  planLine,
}: {
  newEnquiries: number;
  planName: string;
  planLine: string;
}) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const badge = (href: string) =>
    href === "/dashboard/enquiries" && newEnquiries > 0 ? (
      <span className="rounded-[var(--radius-pill)] bg-accent px-1.5 py-[3px] text-[10px] font-semibold leading-none text-accent-fg">{newEnquiries}</span>
    ) : null;

  return (
    <>
      {/* phones: tab row */}
      <nav className="hs -mx-[18px] flex gap-1 overflow-x-auto px-3.5 wide:hidden" aria-label="Dashboard">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active(t.href) ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-2 pb-3 pt-2.5 text-[14px] font-medium ${active(t.href) ? "border-accent text-ink" : "border-transparent text-subtle"}`}
          >
            {t.label}
            {badge(t.href)}
          </Link>
        ))}
      </nav>

      {/* desktop: sticky rail */}
      <nav className="hidden wide:sticky wide:top-[108px] wide:flex wide:flex-col wide:gap-0.5" aria-label="Dashboard">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active(t.href) ? "page" : undefined}
            className={`flex items-center justify-between rounded-[10px] px-3.5 py-[11px] text-[15px] font-medium transition-colors duration-200 ${active(t.href) ? "bg-shade text-ink" : "text-subtle hover:text-ink"}`}
          >
            {t.label}
            {badge(t.href)}
          </Link>
        ))}
        <div data-plan-rail className="mt-6 rounded-[12px] bg-shade px-3.5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Plan</p>
          <p className="mt-1.5 font-display text-[20px] leading-none text-ink">{planName}</p>
          <p className="mt-1 text-[12.5px] leading-[1.4] text-muted">{planLine}</p>
        </div>
        <p className="mt-5 px-3.5 text-[13px] leading-[1.5] text-subtle">
          Something not working? Tell Kim or Alana directly —{" "}
          <a href="mailto:hello@equestriancoaches.au" className="text-accent">
            message us
          </a>
          .
        </p>
      </nav>
    </>
  );
}
