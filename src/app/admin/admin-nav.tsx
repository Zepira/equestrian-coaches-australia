"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ADMIN_GROUPS, findSection } from "./sections";

/**
 * Which groups the admin has folded, kept in localStorage so the rail looks
 * the same on the next screen and the next visit. Read through
 * useSyncExternalStore: the server has no storage, so it renders every group
 * by its default and the client corrects to the saved state without a
 * set-state-in-effect. The snapshot is the raw string, a primitive, so React
 * can compare it between renders.
 */
const FOLD_KEY = "admin-nav-folds";
const FOLD_EVENT = "admin-nav-folds";

function subscribeFolds(cb: () => void) {
  window.addEventListener(FOLD_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(FOLD_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function readFolds() {
  try {
    return localStorage.getItem(FOLD_KEY) ?? "";
  } catch {
    return "";
  }
}
function parseFolds(raw: string): Record<string, boolean> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/**
 * Admin navigation. From 900px it is a sticky rail down the left; narrower
 * than that it collapses to a button showing where you are, because a rail
 * plus a dense table does not fit a phone.
 *
 * Each group folds. A group nobody has touched starts open only if the
 * current screen is in it, so a first visit shows eight short headings and
 * the one group you're in rather than 26 links. Once folded or opened by
 * hand, a group stays that way.
 *
 * The rail scrolls itself rather than growing past the viewport, and the
 * sticky offset clears the site header, which is sticky on admin routes.
 *
 * Breakpoints are all px on purpose: Tailwind v4 cannot order a px
 * breakpoint against the default rem ones.
 */
export function AdminNav({ waiting, reviewsWaiting }: { waiting: number; reviewsWaiting: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const folds = parseFolds(useSyncExternalStore(subscribeFolds, readFolds, () => ""));

  const here = findSection(pathname);
  const counts: Record<string, number> = { "/admin/review": waiting, "/admin/reviews": reviewsWaiting };

  const isOpen = (id: string) => folds[id] ?? here?.group.id === id;
  const toggle = (id: string) => {
    const next = { ...folds, [id]: !isOpen(id) };
    try {
      localStorage.setItem(FOLD_KEY, JSON.stringify(next));
    } catch {
      // Private window or storage blocked: the fold just won't be remembered.
    }
    window.dispatchEvent(new Event(FOLD_EVENT));
  };

  const pill = (n: number) =>
    n > 0 ? (
      <span className="ml-auto rounded-[var(--radius-pill)] bg-accent px-1.5 py-[3px] text-[11px] font-semibold leading-none text-accent-fg">{n}</span>
    ) : null;

  const total = waiting + reviewsWaiting;

  return (
    <div className="min-[900px]:sticky min-[900px]:top-[calc(var(--header-h)_+_1.5rem)] min-[900px]:max-h-[calc(100dvh_-_var(--header-h)_-_3rem)] min-[900px]:overflow-y-auto min-[900px]:overscroll-contain min-[900px]:pr-1">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-3 min-[900px]:block min-[900px]:border-0 min-[900px]:pb-0">
        <div>
          <Link href="/admin" className="font-display text-[28px] leading-none -tracking-[0.01em] text-ink hover:text-accent min-[900px]:text-[34px]">
            Admin
          </Link>
          <p className="mt-1.5 text-[13px] leading-[1.4] text-muted min-[900px]:hidden">{here ? `${here.group.name} · ${here.section.label}` : "Overview"}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-sections"
          className="shrink-0 rounded-[var(--radius-pill)] border border-border bg-surface px-3.5 py-2 text-[13.5px] font-medium text-ink min-[900px]:hidden"
        >
          {open ? "Close" : "Sections"}
          {!open && total > 0 && <span className="ml-1.5 rounded-[var(--radius-pill)] bg-accent px-1.5 py-[2px] text-[11px] font-semibold text-accent-fg">{total}</span>}
        </button>
      </div>

      <nav id="admin-sections" aria-label="Admin" className={`mt-4 min-[900px]:mt-5 min-[900px]:block ${open ? "block" : "hidden"}`}>
        <Link
          href="/admin"
          onClick={() => setOpen(false)}
          aria-current={pathname === "/admin" ? "page" : undefined}
          className={`mb-2 flex items-center rounded-[var(--radius-soft)] px-3 py-2 text-[14.5px] font-medium transition-colors duration-150 ${
            pathname === "/admin" ? "bg-shade text-ink" : "text-muted hover:bg-shade/60 hover:text-ink"
          }`}
        >
          Overview
          {pill(total)}
        </Link>

        <ul className="flex flex-col border-t border-border">
          {ADMIN_GROUPS.map((g) => {
            const expanded = isOpen(g.id);
            const groupCount = g.sections.reduce((n, s) => n + (counts[s.href] ?? 0), 0);
            const panelId = `admin-group-${g.id}`;
            return (
              <li key={g.id} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => toggle(g.id)}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] font-semibold text-ink hover:text-accent"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    className={`size-3 shrink-0 text-subtle transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
                  >
                    <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {g.name}
                  {!expanded && pill(groupCount)}
                </button>
                <div id={panelId} hidden={!expanded} className="pb-2">
                  <div className="flex flex-col gap-0.5">
                    {g.sections.map((s) => {
                      const active = here?.section.href === s.href;
                      return (
                        <Link
                          key={s.href}
                          href={s.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          title={s.blurb}
                          className={`flex items-center gap-2 rounded-[var(--radius-soft)] py-[7px] pl-8 pr-3 text-[14.5px] font-medium transition-colors duration-150 ${
                            active ? "bg-shade text-ink" : "text-muted hover:bg-shade/60 hover:text-ink"
                          }`}
                        >
                          {s.label}
                          {pill(counts[s.href] ?? 0)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 px-3 text-[12.5px] leading-[1.45] text-subtle">Saves go live straight away. Each screen keeps a history of who changed what.</p>
      </nav>
    </div>
  );
}
