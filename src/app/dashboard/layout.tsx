import type { Metadata } from "next";
import { loadDashboard } from "@/lib/dashboard";
import { DashboardNav } from "./dashboard-nav";

// Applies to every /dashboard/* route — private, coach-only pages have no
// reason to be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Dashboard shell (canvas: Dashboards 1a/1b). Phones: the tab row sits
 * directly under the site header; desktop: a 200px rail beside the page.
 * The header itself switches into its dashboard mode ("Coach dashboard"
 * tagline, "View public profile" pill + avatar) by route.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await loadDashboard();
  return (
    <div className="mx-auto max-w-[1184px] px-[18px] pb-10 wide:grid wide:grid-cols-[200px_1fr] wide:items-start wide:gap-12 wide:px-12 wide:pb-20 wide:pt-9">
      <DashboardNav newEnquiries={ctx?.newEnquiries ?? 0} planName={ctx?.planName ?? "No plan yet"} planLine={ctx?.planLine ?? ""} />
      <div className="min-w-0 pt-[22px] wide:pt-0">{children}</div>
    </div>
  );
}
