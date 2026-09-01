import Link from "next/link";
import { AccountLinks } from "@/components/account-links";
import type { AuthState } from "@/hooks/use-auth-state";
import type { NavLink } from "@/lib/nav-links";

const LINK_CLASSNAME = "block rounded-[var(--radius-control)] px-2 py-3 text-[17px] font-medium text-fg hover:bg-accent-soft";
const ACCOUNT_LINK_CLASSNAME = "text-[15px] font-medium text-fg hover:text-accent";

/**
 * The dropdown nav panel shown under the header on small screens. Always
 * solid (bg-surface), regardless of the header's own transparent/overlay
 * state, since it needs to stay legible over whatever content is scrolled
 * behind it.
 */
export function MobileNavPanel({
  links,
  auth,
  onNavigate,
}: {
  links: NavLink[];
  auth: AuthState;
  onNavigate: () => void;
}) {
  return (
    <nav className="border-t border-border bg-surface px-4 pb-4 pt-2 md:hidden">
      <ul className="flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} onClick={onNavigate} className={LINK_CLASSNAME}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-col gap-1">
        <AccountLinks auth={auth} onNavigate={onNavigate} linkClassName={ACCOUNT_LINK_CLASSNAME} />
      </div>
    </nav>
  );
}
