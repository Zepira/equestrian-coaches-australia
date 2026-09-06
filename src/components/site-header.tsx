"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/button";
import { Monogram } from "@/components/monogram";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/search", label: "Find a coach" },
  { href: "/for-coaches", label: "For coaches" },
];

/**
 * Routes whose first section is a full-bleed hero the header floats over.
 * Add a route here when you give it one — the transparent state is only
 * legible over a dark photograph, so it has to be opt-in.
 *
 * This flag only says "this route HAS a hero". Whether the hero is currently
 * rendering full-bleed is a viewport question, and it is answered in CSS
 * (`.site-header[data-overlay]` in globals.css) against the same media
 * condition the hero itself uses — so the two can never disagree, and there is
 * no hydration flash from measuring the viewport in JavaScript.
 */
const OVERLAY_ROUTES = ["/"];

/** True once the page has scrolled past a few pixels. */
function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll(); // a reload part-way down the page starts scrolled
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

type AuthState = { loggedIn: boolean; role: "rider" | "coach" | null };

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ loggedIn: false, role: null });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return; // not pointed at a live Supabase project yet

    async function loadRole(client: NonNullable<typeof supabase>, userId: string) {
      const { data } = await client.from("profiles").select("role").eq("id", userId).single();
      setState({ loggedIn: true, role: (data?.role as "rider" | "coach") ?? null });
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadRole(supabase, user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadRole(supabase, session.user.id);
      else setState({ loggedIn: false, role: null });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}

function AccountLinks({ auth, onNavigate }: { auth: AuthState; onNavigate?: () => void }) {
  const linkClass = "site-header__link text-[15px] font-medium";
  if (!auth.loggedIn) {
    return (
      <>
        <Link href="/login" onClick={onNavigate} className={linkClass}>
          Log in
        </Link>
        <LinkButton href="/signup?role=coach" onClick={onNavigate} className="text-sm">
          List your profile
        </LinkButton>
      </>
    );
  }

  return (
    <>
      <Link href={auth.role === "coach" ? "/dashboard" : "/account"} onClick={onNavigate} className={linkClass}>
        {auth.role === "coach" ? "Dashboard" : "My account"}
      </Link>
      <form action="/auth/sign-out" method="post">
        <button type="submit" className={linkClass}>
          Log out
        </button>
      </form>
    </>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const auth = useAuthState();
  const pathname = usePathname();
  const scrolled = useScrolled();

  const overlayRoute = OVERLAY_ROUTES.includes(pathname);
  // The mobile menu panel needs an opaque bar above it, so opening it forces
  // the solid state just as scrolling does.
  const solid = scrolled || open;
  const linkClass = "site-header__link text-[15px] font-medium";

  return (
    <header className="site-header" data-overlay={overlayRoute} data-solid={solid}>
      <div className="site-header__plate" aria-hidden />
      {/* Two nested boxes, matching the hero's OWN box model exactly
          (.hero__body -> .hero__inner in globals.css) rather than one div
          doing both jobs at once. That distinction matters past ~1800px:
          the hero pads its full-width body by --content-gutter and THEN
          centres a --content-max column inside what's left, so on a very
          wide screen the column's left edge sits at (viewport-max)/2 — the
          gutter is "spent" evenly on both sides, not stacked with the
          centering. A single div with both maxWidth and paddingInline (the
          previous version here) constrains the padding INSIDE that width,
          which centers the padded box a full gutter further right than the
          hero's column — content_max is the same in both, but the two box
          models don't produce the same left edge. */}
      <div style={{ paddingInline: "var(--content-gutter)" }}>
        <div
          className="mx-auto flex h-[var(--header-h)] items-center justify-between"
          style={{ maxWidth: "var(--content-max)" }}
        >
          <Link
            href="/"
            className="flex items-center"
            aria-label="Equestrian Coaches Australia — home"
            onClick={() => setOpen(false)}
          >
            <Monogram className="site-header__mark" />
            <span className="site-header__tagline ml-3 hidden text-xs font-medium uppercase tracking-[0.2em] sm:inline">
              Equestrian Coaches Australia
            </span>
          </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
          <AccountLinks auth={auth} />
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="site-header__mark flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] md:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 block h-0.5 w-5 bg-current transition-transform ${
                open ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] block h-0.5 w-5 bg-current transition-opacity ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[14px] block h-0.5 w-5 bg-current transition-transform ${
                open ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </span>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav className="border-t border-border bg-surface px-4 pb-4 pt-2 md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-[var(--radius-control)] px-2 py-3 text-[17px] font-medium text-fg hover:bg-accent-soft"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-col gap-1">
            <AccountLinks auth={auth} onNavigate={() => setOpen(false)} />
          </div>
        </nav>
      )}
    </header>
  );
}
