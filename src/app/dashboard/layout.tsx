import type { Metadata } from "next";
import { loadDashboard } from "@/lib/dashboard";
import Link from "next/link";
import { DashboardNav } from "./dashboard-nav";

/** Where the profile stands on its way to live (src/lib/provider-lifecycle.ts), when it isn't live. */
function StatusBanner({ status, note }: { status: string; note: string | null }) {
  const box = "mb-6 rounded-[14px] border p-4 text-[15px] leading-[1.5]";
  if (status === "draft")
    return (
      <p className={`${box} border-accent/40 bg-accent-soft text-fg`}>
        Your profile isn&apos;t live yet.{" "}
        <Link href="/onboarding" className="font-medium text-accent">
          Finish setting it up
        </Link>
      </p>
    );
  if (status === "in_review")
    return <p className={`${box} border-border bg-shade text-fg`}>We&apos;re having a look at your profile and will let you know, usually within a day or two.</p>;
  if (status === "changes_requested")
    return (
      <p className={`${box} border-accent/40 bg-accent-soft text-fg`}>
        We asked for a couple of changes{note ? `: ${note}` : "."}{" "}
        <Link href="/onboarding?step=preview" className="font-medium text-accent">
          Make them and send it again
        </Link>
      </p>
    );
  if (status === "hidden")
    return (
      <p className={`${box} border-accent/40 bg-accent-soft text-fg`}>
        Your profile is hidden because your plan has ended.{" "}
        <Link href="/dashboard/billing" className="font-medium text-accent">
          Pick a plan to bring it back
        </Link>
      </p>
    );
  return null;
}

// Applies to every /dashboard/* route — private, coach-only pages have no
// reason to be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Dashboard shell (canvas: Dashboards 1a/1b). Phones: the tab row sits
 * directly under the site header; desktop: a 200px rail beside the page.
 * The header itself switches into its dashboard mode ("Your dashboard"
 * tagline, "View public profile" pill + avatar) by route.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await loadDashboard();
  return (
    <div className="mx-auto max-w-[1184px] px-[18px] pb-10 wide:grid wide:grid-cols-[200px_1fr] wide:items-start wide:gap-12 wide:px-12 wide:pb-20 wide:pt-9">
      <DashboardNav newEnquiries={ctx?.newEnquiries ?? 0} planName={ctx?.planName ?? "No plan yet"} planLine={ctx?.planLine ?? ""} />
      <div className="min-w-0 pt-[22px] wide:pt-0">
        {ctx && <StatusBanner status={String(ctx.provider.status)} note={(ctx.provider.review_note as string | null) ?? null} />}
        {children}
      </div>
    </div>
  );
}
