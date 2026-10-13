import { RichText } from "@/components/rich-text";
import { Wordmark } from "@/components/wordmark";
import { WaitlistForm } from "@/components/waitlist-form";
import { getContent, getProfessions } from "@/lib/cms/read";
import { horseCareOf } from "@/lib/professions";
import Link from "next/link";
import { businessLine } from "@/lib/legal";
import { getBusinessAbn } from "@/lib/settings";
import { SITE_STAGE } from "@/lib/launch";
import { CONTACT_EMAIL } from "@/lib/site-url";

/**
 * The whole public site until SITE_LAUNCHED is true (src/lib/launch.ts): the
 * brand, one line about what this is, and the waitlist.
 *
 * The root layout leaves the header and footer off this page, so it carries
 * its own wordmark. No photograph and no counts on purpose: the copy has to
 * stay true while nothing is live, and a number here would be a claim.
 *
 * Every word comes from the coming_soon content block, so the admins can
 * change it from /admin/pages without a deploy.
 */
export async function ComingSoon() {
  const [copy, professions, footer, abn, pros] = await Promise.all([getContent("coming_soon"), getProfessions(), getContent("footer"), getBusinessAbn(), getContent("coming_soon.professionals")]);
  const horseCare = horseCareOf(professions).map((p) => ({ slug: p.slug, name: p.name }));

  return (
    <div className="fade-in mx-auto flex min-h-[100svh] max-w-[540px] flex-col justify-center px-[18px] py-12 wide:py-16">
      <p className="text-ink">
        <span className="sr-only">Equine Professionals Australia</span>
        <Wordmark size={26} className="wide:hidden" />
        <Wordmark size={32} className="hidden wide:block" />
      </p>

      <p className="mt-10 text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:mt-12 wide:tracking-[0.2em]">
        {copy.eyebrow}
      </p>
      <h1 className="mt-2 font-display text-[40px] leading-[1.02] -tracking-[0.02em] text-ink wide:text-[52px]">
        <RichText text={copy.title} emClassName="italic text-accent" />
      </h1>
      <p className="mt-3.5 text-[16px] leading-[1.5] text-muted wide:text-[17px]">{copy.lead}</p>

      <div className="mt-8 rounded-[18px] border border-border bg-surface p-4 wide:p-6">
        <h2 className="font-display text-[24px] leading-none -tracking-[0.01em] text-ink">{copy.formTitle}</h2>
        <div className="mt-4">
          <WaitlistForm copy={copy} professions={horseCare} />
        </div>
      </div>

      {/* The coaches stage: professionals can sign up now (src/lib/launch.ts). */}
      {SITE_STAGE === "coaches" && (
        <div className="mt-5 flex flex-col gap-3 rounded-[18px] bg-ink p-4 text-ink-fg wide:flex-row wide:items-center wide:justify-between wide:p-6" data-coach-stage-join>
          <div>
            <h2 className="font-display text-[22px] leading-[1.1]">{pros.title}</h2>
            <p className="mt-1.5 text-[14.5px] leading-[1.5] text-ink-fg/80">{pros.body}</p>
          </div>
          <Link href="/list-your-business" className="shrink-0 rounded-[var(--radius-pill)] bg-accent px-5 py-3 text-center text-[15px] font-semibold text-accent-fg hover:bg-accent-hover">
            {pros.button}
          </Link>
        </div>
      )}

      {/* Who we are and the policies, reachable before launch (Stripe's
          website review needs the refunds page and a contact without a
          password; isPreLaunchPath in src/proxy.ts lets these through). */}
      <p className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] leading-[1.6] text-subtle">
        <span>{businessLine(abn, footer.place)}</span>
        <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-accent">{CONTACT_EMAIL}</a>
        <Link href="/terms" className="hover:text-accent">Terms</Link>
        <Link href="/privacy" className="hover:text-accent">Privacy</Link>
        <Link href="/refunds" className="hover:text-accent">Refunds</Link>
      </p>
    </div>
  );
}
