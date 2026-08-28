"use client";

import Link from "next/link";
import { useState } from "react";
import { LinkButton } from "@/components/ui/button";

const navLinks = [
  { href: "/search", label: "Find a coach" },
  { href: "/for-coaches", label: "For coaches" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-fg" onClick={() => setOpen(false)}>
          Equestrian Coaches Australia
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-[15px] font-medium text-fg hover:text-accent">
              {link.label}
            </Link>
          ))}
          <LinkButton href="/dashboard/profile" className="text-sm">
            List your profile
          </LinkButton>
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-md text-fg md:hidden"
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
        <nav className="border-t border-border bg-surface px-4 pb-4 pt-2 md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-3 text-[17px] font-medium text-fg hover:bg-accent-soft"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <LinkButton href="/dashboard/profile" onClick={() => setOpen(false)} className="mt-3 w-full">
            List your profile
          </LinkButton>
        </nav>
      )}
    </header>
  );
}
