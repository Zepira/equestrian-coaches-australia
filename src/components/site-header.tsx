"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/logo-mark";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/search", label: "Find a coach" },
  { href: "/for-coaches", label: "For coaches" },
];

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

function AccountLinks({
  auth,
  onNavigate,
  linkClassName,
}: {
  auth: AuthState;
  onNavigate?: () => void;
  linkClassName: string;
}) {
  if (!auth.loggedIn) {
    return (
      <>
        <Link href="/login" onClick={onNavigate} className={linkClassName}>
          Log in
        </Link>
        <Link
          href="/signup?role=coach"
          onClick={onNavigate}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:opacity-90"
        >
          List your profile
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href={auth.role === "coach" ? "/dashboard" : "/account"} onClick={onNavigate} className={linkClassName}>
        {auth.role === "coach" ? "Dashboard" : "My account"}
      </Link>
      <form action="/auth/sign-out" method="post">
        <button type="submit" className={linkClassName}>
          Log out
        </button>
      </form>
    </>
  );
}

// Scroll-driven state for the transparent-over-hero header — only the
// homepage (a dark, full-bleed hero) uses it; every other page keeps the
// always-solid header untouched.
function useScrolled(active: boolean) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // No cleanup-only early return needed: when inactive, `scrolled` is
    // simply never read (see `transparent` below), so a stale value from a
    // previous page is harmless — resetting it here would mean calling
    // setState synchronously from the effect body, which React flags.
    if (!active) return;
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [active]);

  return scrolled;
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const auth = useAuthState();
  const pathname = usePathname();
  // Only the homepage opens on a full-bleed dark hero — everywhere else the
  // header sits directly on the page background and stays solid.
  const overlay = pathname === "/";
  const scrolled = useScrolled(overlay);
  const transparent = overlay && !open && !scrolled;

  const linkClassName = transparent
    ? "text-[15px] font-medium text-ink-fg hover:text-ink-fg/75"
    : "text-[15px] font-medium text-fg hover:text-accent";

  return (
    <header
      className={`z-40 border-b transition-colors duration-300 ${
        overlay ? "fixed inset-x-0 top-0" : "sticky top-0"
      } ${
        transparent
          ? "border-ink-fg/20 bg-transparent"
          : overlay
            ? "border-ink-fg/10 bg-ink/95 backdrop-blur"
            : "border-border bg-bg/95 backdrop-blur"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:h-24">
        <Link
          href="/"
          className={`flex items-center gap-2.5 font-display text-[15px] font-semibold uppercase tracking-[0.16em] lg:text-lg ${
            transparent || overlay ? "text-ink-fg" : "text-ink"
          }`}
          onClick={() => setOpen(false)}
        >
          <LogoMark className="h-6 w-6 shrink-0" />
          Equestrian Coaches Australia
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex lg:gap-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClassName}>
              {link.label}
            </Link>
          ))}
          <AccountLinks auth={auth} linkClassName={linkClassName} />
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] md:hidden ${
            transparent || overlay ? "text-ink-fg" : "text-fg"
          }`}
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

      {/* Mobile menu panel — always solid, regardless of overlay state,
          since it needs to stay legible over whatever's scrolled behind it */}
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
            <AccountLinks
              auth={auth}
              onNavigate={() => setOpen(false)}
              linkClassName="text-[15px] font-medium text-fg hover:text-accent"
            />
          </div>
        </nav>
      )}
    </header>
  );
}
