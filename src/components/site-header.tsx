"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { Wordmark } from "@/components/wordmark";
import { parseState } from "@/lib/au-states";
import { SearchChips } from "@/components/search-chips";
import { SearchFacets } from "@/components/search-facets";
import { BackToResults } from "@/components/back-to-results";
import { NavDropdown, type NavDropdownItem } from "@/components/nav-dropdown";
import { pathInPrefixes } from "@/lib/professions";
import { createClient } from "@/lib/supabase/client";
import { profilePath } from "@/lib/page-paths";
import { AccountMenu } from "@/components/account-menu";

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

const OVERLAY_ROUTES = ["/", "/coaches", "/horse-care", "/for-coaches", "/for-professionals"];

/**
 * Coach profiles: on phones the page paints its own "← Results / ♡" bar
 * over the photograph (canvas: Coach Profile mobile), so this header hides
 * below 768px; on desktop it is the light bar with "← Back to results"
 * beside the wordmark.
 */
function variantFor(pathname: string): { variant: Variant; coachProfile?: boolean } {
  if (OVERLAY_ROUTES.includes(pathname)) return { variant: "overlay" };
  if (pathname.startsWith("/profile/")) return { variant: "light", coachProfile: true };
  if (pathname === "/search") return { variant: "ink" };
  return { variant: "light" };
}

/** Whether the page has scrolled past `from` + 8px, and whether it sits above `from`. */
function useScrolled(from: number) {
  const [state, setState] = useState({ scrolled: false, aboveRunway: true });
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const next = { scrolled: y > from + 8, aboveRunway: y < from - 1 };
      setState((s) => (s.scrolled === next.scrolled && s.aboveRunway === next.aboveRunway ? s : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [from]);
  return state;
}

/**
 * The iPhone "runway" (13 Oct 2026). Safari 26 only shows the page itself
 * behind the status bar once the page has scrolled; at the very top it
 * paints a flat colour. So on iPhones the hero pages are --runway (72px)
 * taller at the top and open scrolled down by that much: what shows is the
 * same, and the 72px of photo above sits behind the clock. --runway is set
 * in globals.css from data-ios-runway (layout.tsx's boot script) and is 0
 * everywhere else, so nothing changes off iOS. Everything that keyed off
 * "scrollY = 0" (the header going solid, the hero parallax, the status
 * colour strip) counts from the runway instead.
 */
function useRunway(pathname: string) {
  const [runway, setRunway] = useState(0);
  useEffect(() => {
    const read = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--runway")) || 0;
    // A frame later: after the effect below sets data-overlay-route (which
    // --runway depends on) and after Next's own scroll-to-top.
    const frame = requestAnimationFrame(() => {
      const r = read();
      setRunway(r);
      // A fresh arrival (not a back/forward restore further down, not a
      // #link) starts at the runway's end.
      if (r > 0 && !location.hash && window.scrollY < r) window.scrollTo({ top: r, left: 0, behavior: "instant" });
    });
    const onResize = () => setRunway(read());
    window.addEventListener("resize", onResize);
    // Scrolling back up comes to rest at the runway's end, not above it. At
    // the very top Safari paints a flat band behind the status bar instead of
    // the photo, which read as a gap. Only once the finger is up and the
    // scroll has stopped, so it never fights a drag or a fling.
    let touching = false;
    let settle = 0;
    const check = () => {
      const r = read();
      if (r > 0 && !touching && window.scrollY < r - 1) window.scrollTo({ top: r, left: 0, behavior: "smooth" });
    };
    const onScroll = () => {
      clearTimeout(settle);
      settle = window.setTimeout(check, 140);
    };
    const onTouchStart = () => {
      touching = true;
      clearTimeout(settle);
    };
    const onTouchEnd = () => {
      touching = false;
      onScroll();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [pathname]);
  return runway;
}

type AuthState = { loggedIn: boolean; role: "rider" | "provider" | null; name: string | null; email: string | null; coachSlug: string | null; isAdmin: boolean };

const SIGNED_OUT: AuthState = { loggedIn: false, role: null, name: null, email: null, coachSlug: null, isAdmin: false };

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(SIGNED_OUT);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    async function load(client: NonNullable<typeof supabase>, userId: string, email: string | null) {
      // is_admin() reads admin_users (0007_taxonomy.sql) — the only way in
      // is a direct insert, so this is what surfaces the Admin link.
      const [{ data }, { data: isAdmin }] = await Promise.all([
        client.from("profiles").select("role, name").eq("id", userId).single(),
        client.rpc("is_admin"),
      ]);
      const role = (data?.role as "rider" | "provider") ?? null;
      let coachSlug: string | null = null;
      if (role === "provider") {
        // The profile this user edits, through their membership.
        const { data: member } = await client
          .from("provider_members")
          .select("providers(slug)")
          .eq("user_id", userId)
          .order("created_at")
          .limit(1)
          .maybeSingle();
        coachSlug = (member as unknown as { providers: { slug: string } | null } | null)?.providers?.slug ?? null;
      }
      setState({ loggedIn: true, role, name: (data?.name as string | null) ?? null, email, coachSlug, isAdmin: Boolean(isAdmin) });
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) load(supabase, user.id, user.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) load(supabase, session.user.id, session.user.email ?? null);
      else setState(SIGNED_OUT);
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
  const state = parseState(location);
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
        {state ? state.name : location || "Anywhere in Australia"}
        <span className="text-subtle">
          {disciplines.length ? ` · ${disciplines.join(", ")}` : ""}
          <span className="hidden md:inline">{state ? " · state-wide" : location ? ` · within ${radius} km` : ""}</span>
        </span>
      </span>
      <span className="shrink-0 text-[13px] font-medium text-accent">Edit</span>
    </Link>
  );
}

/** The phone rail's skills/setup pill and chips: coaching's vocabulary, so only on a coaching search. */
function CoachRefineRail() {
  const p = useSearchParams().get("p");
  if (p && p !== "coaches") return null;
  return (
    <div className="mt-2.5 flex items-center gap-2">
      <SearchFacets tone="ink" />
      <SearchChips rail className="-mr-[18px] min-w-0 flex-1 pr-[18px]" />
    </div>
  );
}

/**
 * One navigation on every public page: Horse care, Coaches, About. It used to
 * be two, a parent nav on the home page and horse care and a coaches nav on
 * the coaches pages, so a rider on /coaches had no way across to a farrier
 * and the bar changed shape as you moved between the two halves of the site.
 * Each menu now opens with a search of its whole section, which is what
 * "Find a coach" used to be.
 *
 * The call to action is the same words everywhere; only where it goes
 * depends on the section, because a coach arriving from an invite link should
 * land on the coaches sign-up rather than a page asking which kind of
 * business they are.
 */
const PARENT_ROUTES = ["/", "/about", "/list-your-business", "/signup", "/onboarding"];
// Profiles hold every profession, so they wear the parent nav whoever's they are.
const PARENT_PREFIXES = ["/profile/"];
const COACHES_PREFIXES = ["/coaches", "/for-coaches", "/join/coaches"];

/**
 * What the header needs from the CMS, read by the root layout (a server
 * component) and handed down: both menus, the paths that belong to the
 * Horse care door, and the referrer pattern for "Back to results".
 */
export type HeaderData = {
  horseCareMenu: NavDropdownItem[];
  coachesMenu: NavDropdownItem[];
  horseCarePrefixes: string[];
  /**
   * The coaches stage on the public host (src/lib/launch.ts): no menus into
   * the rider side, which still shows the coming soon page, only the pages a
   * professional can use.
   */
  coachesOnly?: boolean;
};

/** The whole nav in the coaches stage. */
const COACH_STAGE_LINKS = [
  { href: "/for-coaches", label: "For coaches" },
  { href: "/for-professionals", label: "For professionals" },
  { href: "/about", label: "About" },
];

export function SiteHeader({ horseCareMenu: HORSE_CARE_MENU, coachesMenu: COACHES_MENU, horseCarePrefixes, coachesOnly = false }: HeaderData) {
  const isHorseCarePath = (pathname: string) => pathInPrefixes(pathname, horseCarePrefixes);
  const isParentRoute = (pathname: string) =>
    PARENT_ROUTES.includes(pathname) || PARENT_PREFIXES.some((p) => pathname.startsWith(p)) || isHorseCarePath(pathname);
  const [open, setOpen] = useState(false);
  const auth = useAuthState();
  const pathname = usePathname();
  const { variant, coachProfile } = variantFor(pathname);
  const runway = useRunway(pathname);
  const { scrolled, aboveRunway } = useScrolled(runway);
  const solid = scrolled || open;
  const close = () => setOpen(false);

  // <html data-overlay-route> — iOS paints <html>'s own background behind
  // the notch; on overlay routes that has to be ink, see globals.css.
  useEffect(() => {
    // A coach profile opens with a full-bleed photo on phones, so the notch
    // strip is dark there too. Only a real profile: a 404 under /profile/
    // has the path but no photograph, and no PageContext marker.
    const profile = Boolean(coachProfile) && Boolean(document.querySelector("[data-page-context]"));
    document.documentElement.dataset.overlayRoute = String(variant === "overlay" || profile);
  }, [variant, coachProfile, pathname]);

  // <html data-door> — the Horse care door's steel accent (globals.css).
  // The inline script in layout.tsx covers the first paint; this keeps it
  // right across client-side navigation. Both read the same prefixes, built
  // from the profession rows. A page whose door the path can't tell (a
  // profile) says so through its PageContext marker, read here after the
  // navigation has committed.
  const pathDoor = isHorseCarePath(pathname) ? "horse-care" : null;
  useEffect(() => {
    const marked = document.querySelector<HTMLElement>("[data-page-context]")?.dataset.pageDoor || null;
    const door = pathDoor ?? marked;
    if (door) document.documentElement.dataset.door = door;
    else delete document.documentElement.dataset.door;
  }, [pathDoor, pathname]);

  const isSearch = variant === "ink";
  // Dashboard mode (canvas: Dashboards): "Your dashboard" tagline and a
  // "View public profile" pill instead of the public nav.
  const isDashboard = pathname.startsWith("/dashboard");
  const inHorseCare = isHorseCarePath(pathname) || pathname === "/for-professionals";
  const inCoaches = !inHorseCare && (COACHES_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || isSearch);
  const listHref = isParentRoute(pathname) ? "/list-your-business" : "/join/coaches";
  // What a professional pays for, one slot in the bar that follows the
  // section: a coach sees the coaching plans, anyone in horse care sees
  // theirs, and the front door offers the page that asks which you are.
  const pitch = inCoaches
    ? { href: "/for-coaches", label: "For coaches" }
    : inHorseCare
      ? { href: "/for-professionals", label: "For professionals" }
      : { href: "/list-your-business", label: "For professionals" };
  const profileHref = auth.coachSlug ? profilePath(auth.coachSlug) : null;
  const account = auth.loggedIn ? (
    <AccountMenu
      name={auth.name}
      email={auth.email}
      isProvider={auth.role === "provider"}
      isAdmin={auth.isAdmin}
      profileHref={profileHref}
    />
  ) : null;

  const phoneLink = "block py-3.5 text-[16px] font-semibold text-ink";

  return (
    <>
    {/* iOS Safari 26 colours its status bar from a fixed element at the top
        edge, not from theme-color; the transparent header gives it nothing,
        so it showed grey above the hero. This strip is that colour (CSS:
        .status-tint), shown only while the header is transparent. */}
    {/* With a runway the photo itself shows behind the status bar, which
        Safari only does with no solid fixed element up there: the strip is
        for when someone scrolls back above the runway. */}
    <div className="status-tint" aria-hidden data-show={variant === "overlay" && !solid && (runway === 0 || aboveRunway) ? "true" : undefined} />
    <header
      className="site-header"
      data-variant={variant}
      data-coach-profile={coachProfile ? "true" : undefined}
      data-solid={variant === "overlay" ? solid : undefined}
    >
      <div className="site-header__inner">
        <Link
          href="/"
          className="flex items-center gap-3.5"
          aria-label="Equine Professionals Australia, home"
          onClick={close}
        >
          {/* Below 360px the words and "Log in" can't share the bar, so the horse stands alone. */}
          <BrandMark height={32} className="hidden max-[359px]:block" />
          <Wordmark size={21} className="max-[359px]:hidden md:hidden" />
          <Wordmark size={26} className="hidden md:block" />
          {isDashboard && (
            <span className="site-header__muted hidden text-[12px] font-medium uppercase tracking-[0.16em] lg:inline">
              Your dashboard
            </span>
          )}
        </Link>
        {coachProfile && (
          <BackToResults
            label="Back to results"
            fromPage
            className="site-header__muted site-header__profile-only -ml-2 mr-auto hidden text-[14px] font-medium md:inline"
          />
        )}

        {isSearch && (
          <Suspense fallback={<span className="flex-1" />}>
            <SearchSummary className="hidden md:flex" />
          </Suspense>
        )}

        {isDashboard ? (
          <div className="flex items-center gap-3 md:gap-5">
            {profileHref && (
              <Link href={profileHref} className="site-header__outline hidden whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-[7px] text-[13px] font-medium min-[420px]:inline-block md:px-4 md:py-2 md:text-[15px]">
                <span className="md:hidden">View profile</span>
                <span className="hidden md:inline">View public profile</span>
              </Link>
            )}
            {account}
          </div>
        ) : (
          <>
            {/* Desktop nav, from 1024px: with the "For …" link the bar needs
                about 900px beside the wordmark, so tablets get the burger.
                On /search the summary pill needs the room too, so the bar
                waits for 1280px there and About and the pitch link go. */}
            <nav className={`hidden items-center gap-7 whitespace-nowrap text-[15px] font-medium ${isSearch ? "xl:flex" : "lg:flex"}`} aria-label="Primary">
              {coachesOnly ? (
                <div className="flex items-center gap-7">
                  {COACH_STAGE_LINKS.map((l) => (
                    <Link key={l.href} href={l.href} className="site-header__link" aria-current={pathname === l.href ? "page" : undefined}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              ) : (
              <div className="flex items-center gap-7">
                <NavDropdown label="Horse care" href="/horse-care" items={HORSE_CARE_MENU} current={inHorseCare} />
                <NavDropdown label="Coaches" href="/coaches" items={COACHES_MENU} current={inCoaches} />
                {!isSearch && (
                  <>
                    <Link href="/about" className="site-header__link" aria-current={pathname === "/about" ? "page" : undefined}>
                      About
                    </Link>
                    <Link href={pitch.href} className="site-header__link" aria-current={pathname === pitch.href ? "page" : undefined}>
                      {pitch.label}
                    </Link>
                  </>
                )}
              </div>
              )}
              {account ?? (
                <>
                  <Link href="/login" className="site-header__link">
                    Log in
                  </Link>
                  {!isSearch && (
                    <Link
                      href={coachesOnly ? "/list-your-business" : listHref}
                      className="site-header__outline rounded-[var(--radius-pill)] px-[18px] py-2.5 hover:bg-ink hover:text-ink-fg"
                    >
                      List your business
                    </Link>
                  )}
                </>
              )}
            </nav>

            {/* Phone and tablet: account (or "Log in") beside the round burger. */}
            <div className={`flex items-center gap-3 ${isSearch ? "xl:hidden" : "lg:hidden"}`}>
              {account ?? (
                <Link href="/login" className="site-header__link -my-2 py-2 text-[14px] font-medium" onClick={close}>
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
          </>
        )}
      </div>

      {/* /search on phones: the summary pill and the filter chips live in
          the sticky ink bar, per the canvas, so one thumb can work them. */}
      {isSearch && (
        <div className="px-[18px] pb-3.5 md:hidden">
          <Suspense fallback={null}>
            <SearchSummary className="mt-0" />
            {/* The "Skills & setup" pill sits outside the scroller, not in
                it: `.hs` scrolls on x, and an element that scrolls on one
                axis clips the other too, which would cut the panel off at
                the rail's edge. */}
            <CoachRefineRail />
          </Suspense>
        </div>
      )}

      {open && !isDashboard && (
        <nav className={`site-header__menu ${isSearch ? "xl:hidden" : "lg:hidden"}`} aria-label="Primary">
          <ul className="flex flex-col">
            {/* The two menus become flat labelled sections here: a nested
                dropdown inside an already-open panel is a worse way to reach
                the same links on a phone. */}
            {coachesOnly &&
              COACH_STAGE_LINKS.map((l) => (
                <li key={l.href} className="border-b border-border">
                  <Link href={l.href} onClick={close} className={phoneLink}>
                    {l.label}
                  </Link>
                </li>
              ))}
            {!coachesOnly && [
              { heading: "Horse care", href: "/horse-care", items: HORSE_CARE_MENU },
              { heading: "Coaches", href: "/coaches", items: COACHES_MENU },
            ].map((group) => (
              <li key={group.heading} className="border-b border-border py-3.5">
                <Link href={group.href} onClick={close} className="block text-[12px] font-medium uppercase tracking-[0.18em] text-accent">
                  {group.heading}
                </Link>
                {/* The first item is the section's own search (layout.tsx puts it there), so it gets a row to itself. */}
                <span className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {group.items.map((item, i) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={`text-[16px] leading-snug text-ink ${i === 0 ? "col-span-2 font-semibold" : ""}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </span>
              </li>
            ))}
            {!coachesOnly && (
              <>
                <li>
                  <Link href="/about" onClick={close} className={phoneLink}>
                    About
                  </Link>
                </li>
                <li className="border-t border-border">
                  <Link href={pitch.href} onClick={close} className={phoneLink}>
                    {pitch.label}
                  </Link>
                </li>
              </>
            )}
            {!auth.loggedIn && (
              <li className="pt-4">
                <Link
                  href={coachesOnly ? "/list-your-business" : listHref}
                  onClick={close}
                  className="block rounded-[var(--radius-soft)] bg-ink py-[15px] text-center text-[16px] font-semibold text-ink-fg"
                >
                  List your business
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
    </>
  );
}
