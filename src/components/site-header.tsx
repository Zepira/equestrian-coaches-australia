"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountLinks } from "@/components/account-links";
import { LogoMark } from "@/components/logo-mark";
import { MobileNavPanel } from "@/components/mobile-nav-panel";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";
import { useAuthState } from "@/hooks/use-auth-state";
import { useHeaderAppearance } from "@/hooks/use-header-appearance";
import { navLinks } from "@/lib/nav-links";

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const auth = useAuthState();
  const appearance = useHeaderAppearance(mobileMenuOpen);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header
      className={`z-40 border-b transition-colors duration-300 ${appearance.positionClassName} ${appearance.colorClassName}`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:h-24">
        <Link
          href="/"
          onClick={closeMobileMenu}
          className={`flex items-center gap-2.5 font-display text-[15px] font-semibold uppercase tracking-[0.16em] lg:text-lg ${appearance.wordmarkClassName}`}
        >
          <LogoMark className="h-6 w-6 shrink-0" />
          Equestrian Coaches Australia
        </Link>

        <nav className="hidden items-center gap-6 md:flex lg:gap-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={appearance.linkClassName}>
              {link.label}
            </Link>
          ))}
          <AccountLinks auth={auth} linkClassName={appearance.linkClassName} />
        </nav>

        <MobileNavToggle
          open={mobileMenuOpen}
          onToggle={() => setMobileMenuOpen((open) => !open)}
          colorClassName={appearance.iconClassName}
        />
      </div>

      {mobileMenuOpen && <MobileNavPanel links={navLinks} auth={auth} onNavigate={closeMobileMenu} />}
    </header>
  );
}
