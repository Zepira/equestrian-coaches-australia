"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { SearchChips } from "@/components/search-chips";
import { BackToResults } from "@/components/back-to-results";
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

const OVERLAY_ROUTES = ["/", "/for-coaches"];

/**
 * Coach profiles: on phones the page paints its own "← Results / ♡" bar
 * over the photograph (canvas: Coach Profile mobile), so this header hides
 * below 768px; on desktop it is the light bar with "← Back to results"
 * beside the wordmark.
 */
function variantFor(pathname: string): { variant: Variant; coachProfile?: boolean } {
  if (OVERLAY_ROUTES.includes(pathname)) return { variant: "overlay" };
  if (pathname.startsWith("/coaches/")) return { variant: "light", coachProfile: true };
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

type AuthState = { loggedIn: boolean; role: "rider" | "coach" | null; name: string | null; coachSlug: string | null; avatarUrl: string | null };

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ loggedIn: false, role: null, name: null, coachSlug: null, avatarUrl: null });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    async function load(client: NonNullable<typeof supabase>, userId: string) {
      const { data } = await client.from("profiles").select("role, name").eq("id", userId).single();
      const role = (data?.role as "rider" | "coach") ?? null;
      let coachSlug: string | null = null;
      let avatarUrl: string | null = null;
      if (role === "coach") {
        const [{ data: cp }, { data: photo }] = await Promise.all([
          client.from("coach_profiles").select("slug").eq("id", userId).maybeSingle(),
          client.from("coach_photos").select("storage_path").eq("coach_id", userId).order("sort_order").limit(1).maybeSingle(),
        ]);
        coachSlug = (cp?.slug as string | undefined) ?? null;
        if (photo?.storage_path) avatarUrl = client.storage.from("coach-photos").getPublicUrl(photo.storage_path).data.publicUrl;
      }
      setState({ loggedIn: true, role, name: (data?.name as string | null) ?? null, coachSlug, avatarUrl });
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) load(supabase, user.id);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) load(supabase, session.user.id);
      else setState({ loggedIn: false, role: null, name: null, coachSlug: null, avatarUrl: null });
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

function Avatar({ name, src }: { name: string | null; src?: string | null }) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  if (src) {
    return (
      <span aria-hidden className="block h-9 w-9 overflow-hidden rounded-full bg-shade">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover object-[50%_25%]" />
      </span>
    );
  }
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
  const { variant, coachProfile } = variantFor(pathname);
  const solid = scrolled || open;
  const close = () => setOpen(false);

  // <html data-overlay-route> — iOS paints <html>'s own background behind
  // the notch; on overlay routes that has to be ink, see globals.css.
  useEffect(() => {
    // A coach profile opens with a full-bleed photo on phones, so the notch
    // strip is dark there too.
    document.documentElement.dataset.overlayRoute = String(variant === "overlay" || Boolean(coachProfile));
  }, [variant, coachProfile]);

  const firstName = auth.name?.split(" ")[0] ?? null;
  const accountHref = auth.role === "coach" ? "/dashboard" : "/account";
  const isSearch = variant === "ink";
  // Dashboard mode (canvas: Dashboards): "Coach dashboard" tagline, a
  // "View public profile" pill and the coach's avatar + first name instead
  // of the public nav.
  const isDashboard = pathname.startsWith("/dashboard");
  const profileHref = auth.coachSlug ? `/coaches/${auth.coachSlug}` : "/dashboard/profile";

  return (
    <header
      className="site-header"
      data-variant={variant}
      data-coach-profile={coachProfile ? "true" : undefined}
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
          {!isSearch && !coachProfile && (
            <span className="site-header__muted hidden text-[12px] font-medium uppercase tracking-[0.16em] lg:inline">
              {isDashboard ? "Coach dashboard" : "Equestrian Coaches Australia"}
            </span>
          )}
        </Link>
        {coachProfile && (
          <BackToResults label="Back to results" className="site-header__muted -ml-2 mr-auto hidden text-[14px] font-medium md:inline" />
        )}

        {isSearch && (
          <Suspense fallback={<span className="flex-1" />}>
            <SearchSummary className="hidden md:flex" />
          </Suspense>
        )}

        {isDashboard ? (
          <div className="flex items-center gap-2.5 md:gap-[22px]">
            <Link href={profileHref} className="site-header__outline whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-[7px] text-[13px] font-medium md:px-4 md:py-2 md:text-[15px]">
              <span className="md:hidden">View profile</span>
              <span className="hidden md:inline">View public profile</span>
            </Link>
            <Link href="/dashboard" className="site-header__link flex items-center gap-2.5 text-[15px] font-medium" aria-label={firstName ?? "Dashboard"}>
              <Avatar name={auth.name} src={auth.avatarUrl} />
              <span className="hidden md:inline">{firstName}</span>
            </Link>
          </div>
        ) : null}

        {/* Desktop nav */}
        <nav className={`hidden items-center gap-7 text-[15px] font-medium md:flex ${isDashboard ? "md:hidden" : ""}`} aria-label="Primary">
          {!isSearch &&
            NAV.filter((l) => !coachProfile || l.label !== "Disciplines").map((l) => {
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
        <div className={`${isDashboard ? "hidden" : "flex"} items-center gap-3.5 md:hidden`}>
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
