"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/search", label: "Find a coach" },
  { href: "/disciplines/dressage", label: "Disciplines" },
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

function AccountLinks({ auth, onNavigate }: { auth: AuthState; onNavigate?: () => void }) {
  if (!auth.loggedIn) {
    return (
      <>
        <Link
          href="/login"
          onClick={onNavigate}
          className="text-[15px] font-medium text-ink-fg hover:text-ink-fg/70"
        >
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
      <Link
        href={auth.role === "coach" ? "/dashboard" : "/account"}
        onClick={onNavigate}
        className="text-[15px] font-medium text-ink-fg hover:text-ink-fg/70"
      >
        {auth.role === "coach" ? "Dashboard" : "My account"}
      </Link>
      <form action="/auth/sign-out" method="post">
        <button type="submit" className="text-[15px] font-medium text-ink-fg hover:text-ink-fg/70">
          Log out
        </button>
      </form>
    </>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const auth = useAuthState();

  return (
    <header className="sticky top-0 z-40 bg-ink text-ink-fg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-3" onClick={() => setOpen(false)}>
          <span className="font-display text-2xl font-bold text-ink-fg">ECA</span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-fg/70">
            Equestrian Coaches Australia
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-ink-fg hover:text-ink-fg/70"
            >
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
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] text-ink-fg md:hidden"
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

      {/* Mobile menu panel */}
      {open && (
        <nav className="border-t border-ink-fg/15 bg-ink px-4 pb-4 pt-2 md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-[var(--radius-control)] px-2 py-3 text-[17px] font-medium text-ink-fg hover:bg-ink-fg/10"
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
