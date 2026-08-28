import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <div className="text-base font-bold text-fg">Equestrian Coaches Australia</div>
          <p className="mt-2 text-sm text-muted">
            Find the coach who teaches exactly what you ride, wherever you are in Australia.
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-semibold text-fg">Riders</div>
          <ul className="flex flex-col gap-2 text-muted">
            <li>
              <Link href="/search" className="hover:text-accent">
                Find a coach
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-accent">
                My account
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-semibold text-fg">Coaches</div>
          <ul className="flex flex-col gap-2 text-muted">
            <li>
              <Link href="/for-coaches" className="hover:text-accent">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-accent">
                Coach dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-xs text-muted sm:px-6">
        © {new Date().getFullYear()} Equestrian Coaches Australia
      </div>
    </footer>
  );
}
