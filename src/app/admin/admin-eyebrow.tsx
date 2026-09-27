"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { findSection } from "./sections";

/**
 * A line above every admin screen saying which group it sits in, so a
 * screen reached from a bookmark still says where it lives. What each screen
 * is for is on the overview and in the rail's tooltips; most screens already
 * open with their own line, so repeating it here would say it twice.
 */
export function AdminEyebrow() {
  const here = findSection(usePathname());
  if (!here) return null;
  return (
    <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">
      <Link href="/admin" className="hover:underline">Admin</Link>
      <span className="text-subtle"> / </span>
      {here.group.name}
    </p>
  );
}
