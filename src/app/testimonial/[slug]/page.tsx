import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { TestimonialForm } from "@/components/testimonial-form";
import { createServiceSupabase } from "@/lib/supabase/service";
import { fillVariables, getContent } from "@/lib/cms/read";
import { profilePath } from "@/lib/page-paths";
import { TESTIMONIAL_LIMITS, testimonialTarget } from "@/lib/testimonials";

export const metadata = { title: "Write a testimonial", robots: { index: false, follow: false } };

/**
 * /testimonial/[slug]: the link a professional on a plan with testimonial
 * tools sends a client. What they write waits for the professional to show
 * it, labelled "Provided by the business"; it isn't a review and never
 * counts toward the rating (reviews have their own link, /review/[slug]).
 */
export default async function TestimonialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = createServiceSupabase();
  if (!service) notFound();
  const [{ data: exists }, target, w, notices] = await Promise.all([
    service.from("providers").select("id, name").eq("slug", slug).neq("status", "hidden").maybeSingle(),
    testimonialTarget(service, slug),
    getContent("testimonials.words"),
    getContent("legal.notices"),
  ]);
  if (!exists) notFound();
  const name = (target?.name ?? exists.name) as string;
  const f = (s: string) => fillVariables(s, { name, first_name: name.split(" ")[0] });

  return (
    <AuthShell
      eyebrow="Testimonial"
      title={f(w.heading)}
      lead={target ? f(w.intro) : f(w.closed)}
      footer={
        target?.published ? (
          <Link href={profilePath(slug)} className="font-medium text-accent">
            {f("{first_name}'s profile")}
          </Link>
        ) : undefined
      }
    >
      {target && (
        <TestimonialForm
          slug={slug}
          maxLength={TESTIMONIAL_LIMITS.quote}
          notice={fillVariables(notices.testimonial, { name: target.firstName })}
          words={{
            quoteLabel: w.quoteLabel,
            quoteHint: w.quoteHint,
            nameLabel: w.nameLabel,
            nameHint: w.nameHint,
            placeLabel: w.placeLabel,
            placeHint: w.placeHint,
            consent: f(w.consent),
            button: f(w.button),
            sent: f(w.sent),
          }}
        />
      )}
    </AuthShell>
  );
}
