import Link from "next/link";
import { Monogram } from "@/components/monogram";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink text-ink-fg">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:grid-cols-3 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center">
            <Monogram />
            <span className="ml-3 hidden text-xs font-medium uppercase tracking-[0.2em] text-ink-fg/70 sm:inline">
              Equestrian Coaches Australia
            </span>
          </div>
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-ink-fg/78">
            Find the coach who teaches exactly what you ride, wherever you are in Australia.
          </p>
        </div>
        <div className="text-[15px]">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-border">Riders</div>
          <ul className="flex flex-col gap-2.5 text-ink-fg/82">
            <li>
              <Link href="/search" className="hover:text-ink-fg">
                Find a coach
              </Link>
            </li>
            <li>
              <Link href="/disciplines/dressage" className="hover:text-ink-fg">
                Browse disciplines
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-ink-fg">
                My account
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-[15px]">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-border">Coaches</div>
          <ul className="flex flex-col gap-2.5 text-ink-fg/82">
            <li>
              <Link href="/for-coaches" className="hover:text-ink-fg">
                List your profile
              </Link>
            </li>
            <li>
              <Link href="/for-coaches" className="hover:text-ink-fg">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-ink-fg">
                Coach dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-[15px]">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-border">About</div>
          <ul className="flex flex-col gap-2.5 text-ink-fg/82">
            <li>
              <Link href="/login" className="hover:text-ink-fg">
                Log in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-fg/25 px-4 py-6 text-sm text-ink-fg/60 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Equestrian Coaches Australia</div>
        </div>
      </div>
    </footer>
  );
}
