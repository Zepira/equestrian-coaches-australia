import { notFound } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ReportReviewForm } from "@/components/report-review-form";
import { createServiceSupabase } from "@/lib/supabase/service";
import { displayName, REPORT_REASONS } from "@/lib/reviews";
import { profilePath } from "@/lib/page-paths";

export const metadata = { title: "Report a review", robots: { index: false, follow: false } };

/** "Report this review", from any review on any profile (M5). */
export default async function ReportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createServiceSupabase();
  if (!service || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: r } = await service.from("reviews").select("id, author_name, rating, body, providers(name, slug)").eq("id", id).eq("status", "published").maybeSingle();
  if (!r) notFound();
  const p = (r as unknown as { providers: { name: string; slug: string } }).providers;
  return (
    <AuthShell
      eyebrow="Report a review"
      title="What's wrong with it?"
      lead={
        <>
          We take a review down only for one of the reasons in <Link href="/review-policy" className="font-medium text-accent">our review policy</Link>, never because it&rsquo;s negative.
        </>
      }
      footer={<Link href={profilePath(p.slug)} className="font-medium text-accent">Back to {p.name}&rsquo;s profile</Link>}
    >
      <blockquote className="mb-5 rounded-[12px] bg-shade p-3.5 text-[14px] leading-[1.5] text-fg">
        <span className="block text-[13px] text-subtle">
          {displayName(r.author_name as string)} on {p.name}, {r.rating} out of 5
        </span>
        <span className="mt-1 block">{String(r.body).length > 280 ? `${String(r.body).slice(0, 280)}…` : String(r.body)}</span>
      </blockquote>
      <ReportReviewForm reviewId={r.id as string} reasons={Object.entries(REPORT_REASONS)} />
    </AuthShell>
  );
}
