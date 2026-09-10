"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { SearchChips } from "@/components/search-chips";
import { createClient } from "@/lib/supabase/client";

/**
 * Header from the Golden Hour canvases. Three variants, resolved from the
 * route (see `variantFor`), styled in `.site-header[data-variant]` in
 * globals.css:
 *
 *   overlay  floats over a full-bleed hero (home, for-coaches; coach
 *            profile on phones only — `data-overlay-scope="mobile"` lets the
 *            CSS switch that one to the light bar from 768px)
 *   ink      solid green with the search summary pill (search results)
 *   light    translucent cream (everything else)
 *
 * JavaScript supplies one bit: `data-solid`, true once the page has scrolled
 * (or the phone menu is open), which cross-fades an overlay header to the
 * light bar — the one deviation from the canvases, which keep the gradient
 * at every scroll position. Nothing hides on scroll.
 */
type Variant = "overlay" | "ink" | "light";

// "/for-coaches" joins this list in Phase R6, once it has its full-bleed hero.
const OVERLAY_ROUTES = ["/"];
const OVERLAY_MOBILE_PREFIXES = ["/coaches/"];

function variantFor(pathname: string): { variant: Variant; scope?: "mobile" } {
  if (OVERLAY_ROUTES.includes(pathname)) return { variant: "overlay" };
  if (OVERLAY_MOBILE_PREFIXES.some((p) => pathname.startsWith(p))) return { variant: "overlay", scope: "mobile" };
  if (pathname === "/search") return { variant: "ink" };
  return { variant: "light" };
}

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

type AuthState = { loggedIn: boolean; role: "rider" | "coach" | null; name: string | null };

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ loggedIn: false, role: null, name: null });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    async function load(client: NonNullable<typeof supabase>, userId: string) {
      const { data } = await client.from("profiles").select("role, name").eq("id", userId).single();
      setState({
        loggedIn: true,
        role: (data?.role as "rider" | "coach") ?? null,
        name: (data?.name as string | null) ?? null,
      });
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) load(supabase, user.id);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) load(supabase, session.user.id);
      else setState({ loggedIn: false, role: null, name: null });
    });
    return () => subscription.unsubscribe();
  }, []);

  return state;
}

/** "Bendigo VIC · Dressage · within 50 km" in the ink header on /search. */
function SearchSummary({ className = "" }: { className?: string }) {
  const params = useSearchParams();
  const location = params.get("location") ?? "";
  const disciplines = (params.get("d") ?? "")
    .split(",")
    .filter(Boolean)
    .map((s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  const radius = params.get("r") ?? "50";
  const edit = new URLSearchParams(params.toString());
  edit.set("edit", "1");
  return (
    <Link
      href={`/search?${edit.toString()}`}
      scroll={false}
      className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-input)] bg-surface px-4 py-2.5 text-[16px] text-fg md:max-w-[620px] ${className}`}
    >
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
      <span className="min-w-0 flex-1 truncate">
        {location || "Anywhere in Australia"}
        <span className="text-subtle">
          {disciplines.length ? ` · ${disciplines.join(", ")}` : ""}
          <span className="hidden md:inline"> · within {radius} km</span>
        </span>
      </span>
      <span className="shrink-0 text-[13px] font-medium text-accent">Edit</span>
    </Link>
  );
}

function Avatar({ name }: { name: string | null }) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-[16px] text-ink-fg"
    >
      {initial}
    </span>
  );
}

const NAV = [
  { href: "/search", label: "Find a coach" },
  { href: "/disciplines/dressage", label: "Disciplines", match: "/disciplines" },
  { href: "/for-coaches", label: "For coaches" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const auth = useAuthState();
  const pathname = usePathname();
  const scrolled = useScrolled();
  const { variant, scope } = variantFor(pathname);
  const solid = scrolled || open;
  const close = () => setOpen(false);

  // <html data-overlay-route> — iOS paints <html>'s own background behind
  // the notch; on overlay routes that has to be ink, see globals.css.
  useEffect(() => {
    document.documentElement.dataset.overlayRoute = String(variant === "overlay" && !scope);
  }, [variant, scope]);

  const firstName = auth.name?.split(" ")[0] ?? null;
  const accountHref = auth.role === "coach" ? "/dashboard" : "/account";
  const isSearch = variant === "ink";

  return (
    <header
      className="site-header"
      data-variant={variant}
      data-overlay-scope={scope}
      data-solid={variant === "overlay" ? solid : undefined}
    >
      <div className="site-header__inner">
        <Link
          href="/"
          className="flex items-baseline gap-3.5"
          aria-label="Equestrian Coaches Australia — home"
          onClick={close}
        >
          <Wordmark size={26} className="md:hidden" />
          <Wordmark size={30} className="hidden md:inline" />
          {!isSearch && (
            <span className="site-header__muted hidden text-[12px] font-medium uppercase tracking-[0.16em] lg:inline">
              Equestrian Coaches Australia
            </span>
          )}
        </Link>

        {isSearch && (
          <Suspense fallback={<span className="flex-1" />}>
            <SearchSummary className="hidden md:flex" />
          </Suspense>
        )}

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 text-[15px] font-medium md:flex" aria-label="Primary">
          {!isSearch &&
            NAV.map((l) => {
              const current = pathname === l.href || (l.match ? pathname.startsWith(l.match) : false);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="site-header__link"
                  aria-current={current ? "page" : undefined}
                >
                  {l.label}
                </Link>
              );
            })}
          {isSearch && (
            <Link href="/for-coaches" className="site-header__link">
              For coaches
            </Link>
          )}
          {auth.loggedIn ? (
            <>
              <Link href={accountHref} className="site-header__link flex items-center gap-2.5">
                <Avatar name={auth.name} />
                {firstName ?? (auth.role === "coach" ? "Dashboard" : "My account")}
              </Link>
              <form action="/auth/sign-out" method="post">
                <button type="submit" className="site-header__link">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="site-header__link">
                Log in
              </Link>
              {!isSearch && (
                <Link
                  href="/signup?role=coach"
                  className="site-header__outline rounded-[var(--radius-pill)] px-[18px] py-2.5 hover:bg-ink hover:text-ink-fg"
                >
                  List your profile
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Phone: "Log in" + round burger */}
        <div className="flex items-center gap-3.5 md:hidden">
          {auth.loggedIn ? (
            <Link href={accountHref} aria-label={firstName ?? "My account"} onClick={close}>
              <Avatar name={auth.name} />
            </Link>
          ) : (
            <Link href="/login" className="site-header__link text-[14px] font-medium" onClick={close}>
              Log in
            </Link>
          )}
          <button
            type="button"
            className="site-header__burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* /search on phones: the summary pill and the filter chips live in
          the sticky ink bar, per the canvas, so one thumb can work them. */}
      {isSearch && (
        <div className="px-[18px] pb-3.5 md:hidden">
          <Suspense fallback={null}>
            <SearchSummary className="mt-0" />
            <SearchChips rail className="-mx-[18px] mt-2.5 px-[18px]" />
          </Suspense>
        </div>
      )}

      {open && (
        <nav className="site-header__menu md:hidden" aria-label="Primary">
          <ul className="flex flex-col">
            {NAV.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={close}
                  className="block border-b border-border py-3.5 font-display text-[24px] text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {auth.loggedIn ? (
              <>
                <li>
                  <Link
                    href={accountHref}
                    onClick={close}
                    className="block border-b border-border py-3.5 font-display text-[24px] text-ink"
                  >
                    {auth.role === "coach" ? "Dashboard" : "My account"}
                  </Link>
                </li>
                <li>
                  <form action="/auth/sign-out" method="post">
                    <button type="submit" className="block w-full py-3.5 text-left text-[15px] font-medium text-subtle">
                      Log out
                    </button>
                  </form>
                </li>
              </>
            ) : (
              <li className="pt-4">
                <Link
                  href="/signup?role=coach"
                  onClick={close}
                  className="block rounded-[var(--radius-soft)] bg-ink py-[15px] text-center text-[16px] font-semibold text-ink-fg"
                >
                  List your profile
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
