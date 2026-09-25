import { RichText } from "@/components/rich-text";
import { Wordmark } from "@/components/wordmark";
import { WaitlistForm } from "@/components/waitlist-form";
import { getContent, getProfessions } from "@/lib/cms/read";
import { horseCareOf } from "@/lib/professions";

/**
 * The whole public site until SITE_LAUNCHED is true (src/lib/launch.ts): the
 * brand, one line about what this is, and the waitlist.
 *
 * The root layout leaves the header and footer off this page, so it carries
 * its own wordmark. No photograph and no counts on purpose: the copy has to
 * stay true while nothing is live, and a number here would be a claim.
 *
 * Every word comes from the coming_soon content block, so Alana and Kim can
 * change it from /admin/pages without a deploy.
 */
export async function ComingSoon() {
  const [copy, professions] = await Promise.all([getContent("coming_soon"), getProfessions()]);
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
    </div>
  );
}
