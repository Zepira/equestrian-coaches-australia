import Link from "next/link";

const tabs = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/clinics", label: "Clinics" },
  { href: "/dashboard/billing", label: "Billing" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-fg sm:text-3xl">Coach dashboard</h1>

      <nav className="mt-6 -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted hover:text-fg"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
