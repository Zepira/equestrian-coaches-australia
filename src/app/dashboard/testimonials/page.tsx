import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyField } from "@/components/copy-field";
import { loadDashboard } from "@/lib/dashboard";
import { getPlanCapabilities } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site-url";
import { profilePath } from "@/lib/page-paths";
import { getAllTestimonials, TESTIMONIAL_LIMITS } from "@/lib/testimonials";
import { hasTestimonialTools, TIERS } from "@/lib/tiers";
import { AddTestimonial, OtherTestimonial, ShownTestimonial } from "./testimonial-parts";

export const metadata = { title: "Testimonials", robots: { index: false, follow: false } };

/**
 * Dashboard → Testimonials: the quotes a professional chooses to show
 * (src/lib/testimonials.ts). Waiting ones from the request link first, then
 * the request link (or what plan has it), what's on the profile in order,
 * what's hidden, and a form to add one by hand.
 */
export default async function DashboardTestimonialsPage() {
  const ctx = await loadDashboard();
  if (!ctx) redirect("/login?next=/dashboard/testimonials");
  const { supabase, providerId, firstName, professions, tier, status, plans, slug } = ctx;
  const audience = professions[0].audienceNoun;
  const [all, caps] = await Promise.all([getAllTestimonials(supabase, providerId), getPlanCapabilities()]);
  const tools = hasTestimonialTools(tier, status, caps);
  const shown = all.filter((t) => t.status === "shown");
  const ordered = tools ? [...shown.filter((t) => t.pinned), ...shown.filter((t) => !t.pinned)] : shown;
  const waiting = all.filter((t) => t.status === "pending");
  const hidden = all.filter((t) => t.status === "declined");
  const toolPlans = TIERS.filter((t) => caps[t].testimonialTools).map((t) => plans[t].name);
  const card = "rounded-[16px] border border-border bg-surface p-4 wide:p-5";
  const max = TESTIMONIAL_LIMITS.quote;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[34px] leading-none text-ink wide:text-[40px]">Testimonials</h1>
        <p className="mt-2 max-w-[64ch] text-[15px] leading-[1.5] text-muted">
          {shown.length === 0 ? `None on your profile yet, ${firstName}.` : `${shown.length} on your profile.`} Testimonials are the quotes you choose to show. They&rsquo;re marked &ldquo;Provided by the business&rdquo; and don&rsquo;t count toward your star rating;{" "}
          <Link href="/dashboard/reviews" className="font-medium text-accent">reviews</Link> are the independent ones.
          {slug && shown.length > 0 && (
            <>
              {" "}
              <Link href={`${profilePath(slug)}#testimonials`} className="font-medium text-accent">See them on your profile</Link>
            </>
          )}
        </p>
      </div>

      {waiting.length > 0 && (
        <section className="flex flex-col gap-3" data-testimonials-waiting>
          <h2 className="font-display text-[24px] leading-none text-ink">Waiting for you</h2>
          <p className="-mt-1 text-[13.5px] text-subtle">Sent through your link. Nothing shows until you say so.</p>
          {waiting.map((t) => (
            <OtherTestimonial key={t.id} t={t} waiting />
          ))}
        </section>
      )}

      <section className={card} data-testimonial-link>
        <h2 className="font-display text-[22px] leading-none text-ink">Ask for a testimonial</h2>
        {tools && slug ? (
          <>
            <p className="mt-1.5 text-[13px] leading-[1.5] text-subtle">
              Send this to a {audience} who&rsquo;d be happy to write a few words, by text or email. What they write comes to you first, and you choose whether to show it. We&rsquo;ll email you when one arrives.
            </p>
            <div className="mt-3">
              <CopyField value={absoluteUrl(`/testimonial/${slug}`)} label="Testimonial link" />
            </div>
          </>
        ) : (
          <p className="mt-1.5 text-[13px] leading-[1.5] text-subtle">
            {toolPlans.length > 0 ? `${toolPlans.join(" and ")} include` : "Some plans include"} a link you can send a {audience}, so they write it themselves and you choose whether to show it, plus pinning your favourite to the top.{" "}
            <Link href="/dashboard/billing" className="font-medium text-accent">Change plan</Link>. On any plan you can add them yourself below.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3" data-testimonials-shown>
        <h2 className="font-display text-[24px] leading-none text-ink">On your profile</h2>
        {ordered.length === 0 ? (
          <p className="-mt-1 text-[14px] text-muted">Nothing yet. Three or more makes a complete profile.</p>
        ) : (
          <>
            <p className="-mt-1 text-[13.5px] text-subtle">In this order{tools ? ", with your pinned one first" : ""}.</p>
            {ordered.map((t, i) => (
              <ShownTestimonial key={t.id} t={t} first={i === 0} last={i === ordered.length - 1} canPin={tools} maxLength={max} audience={audience} />
            ))}
          </>
        )}
      </section>

      <AddTestimonial maxLength={max} audience={audience} />

      {hidden.length > 0 && (
        <section className="flex flex-col gap-3" data-testimonials-hidden>
          <h2 className="font-display text-[22px] leading-none text-ink">Hidden</h2>
          <p className="-mt-1 text-[13.5px] text-subtle">Not on your profile. Show one again, or delete it.</p>
          {hidden.map((t) => (
            <OtherTestimonial key={t.id} t={t} waiting={false} />
          ))}
        </section>
      )}

      <section className={card}>
        <h2 className="font-display text-[20px] leading-none text-ink">The rules</h2>
        <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.5] text-muted">
          <li>Only show what a real {audience} said and agreed to you showing, in their words. You can fix a typo in one you typed in; one a {audience} wrote through your link can&rsquo;t be edited.</li>
          <li>Don&rsquo;t offer anything in return for one.</li>
          <li>You choose which to show. That&rsquo;s why they&rsquo;re labelled &ldquo;Provided by the business&rdquo; and kept apart from reviews.</li>
        </ul>
      </section>
    </div>
  );
}
