/**
 * Where the header's "List your business" goes (parent nav and every horse
 * care page). Two doors, each in its own colours: riding coaches to the
 * coach plans page, horse care professionals to sign-up. The horse care
 * card sets `data-door="horse-care"` on itself, which puts just that block
 * in steel (globals.css).
 *
 * Sign-up still creates the coach-shaped profile; the dashboard does not
 * ask for a profession yet (see CLAUDE.md, "Professions above disciplines").
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ProfessionGlyph } from "@/components/profession-glyph";
import { horseCareOf } from "@/lib/professions";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import { getPlans } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const plans = await getPlans();
  return {
    title: "List your business",
    description: `Riding coaches and horse care professionals list here from ${plans.listed.monthly} a month. Riders and owners contact you directly, and we take no commission.`,
  };
}

export default async function ListYourBusiness() {
  const [professions, plans, copy] = await Promise.all([getProfessions(), getPlans(), getContent("list_your_business")]);
  const fill = (text: string) => fillVariables(text, { listed_price: plans.listed.monthly, top_price: plans.clinic.monthly });
  const professionNames = horseCareOf(professions).map((p) => p.name.toLowerCase());
  const professionList = `${professionNames.slice(0, -1).join(", ")} and ${professionNames.at(-1)}`;

  return (
    <div className="mx-auto max-w-[1184px] px-[18px] pb-20 pt-12 wide:px-12 wide:pb-[120px] wide:pt-20">
      <p className="fade-in text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">{copy.eyebrow}</p>
      <h1 className="fade-in mt-3 max-w-[16ch] text-[46px] leading-[0.98] -tracking-[0.02em] text-ink wide:mt-4 wide:text-[80px] wide:leading-[0.94] wide:-tracking-[0.03em]">
        {/* Not RiseWords: its emphasis is peach, which is for dark grounds and
            unreadable on cream. */}
        {copy.headline} <em className="text-accent">{copy.headlineEmphasis}</em>
      </h1>
      <p className="fade-in mt-5 max-w-[52ch] text-[17px] leading-[1.5] text-muted wide:mt-7 wide:text-[19px]" style={{ animationDelay: "0.5s" }}>
        {fill(copy.lead)}
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 wide:mt-14 wide:grid-cols-2 wide:gap-6">
        <article className="flex flex-col rounded-[16px] border border-border bg-surface p-6 wide:rounded-[20px] wide:p-10">
          <ProfessionGlyph slug="coaches" size={36} className="text-accent" />
          <h2 className="mt-5 text-[34px] leading-none text-ink wide:text-[44px]">{copy.coachesTitle}</h2>
          <p className="mt-3 flex-1 text-[15px] leading-[1.55] text-muted wide:text-[17px]">
            {fill(copy.coachesBody)}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/for-coaches"
              className="rounded-[var(--radius-pill)] bg-accent px-[26px] py-[14px] text-[16px] font-semibold text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover"
            >
              See coach plans
            </Link>
            <Link href="/signup?role=coach" className="border-b border-current text-[15px] font-medium text-accent">
              Sign up now
            </Link>
          </div>
        </article>

        <article data-door="horse-care" className="flex flex-col rounded-[16px] border border-border bg-[#e4e9ee] p-6 wide:rounded-[20px] wide:p-10">
          <ProfessionGlyph slug="farriers" size={36} className="text-accent" />
          <h2 className="mt-5 text-[34px] leading-none text-ink wide:text-[44px]">{copy.horseCareTitle}</h2>
          <p className="mt-3 flex-1 text-[15px] leading-[1.55] text-muted wide:text-[17px]">
            {professionList.charAt(0).toUpperCase() + professionList.slice(1)}. {fill(copy.horseCareBody)}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/signup?role=coach"
              className="rounded-[var(--radius-pill)] bg-accent px-[26px] py-[14px] text-[16px] font-semibold text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover"
            >
              Create your profile
            </Link>
            <Link href="/horse-care" className="border-b border-current text-[15px] font-medium text-accent">
              See horse care
            </Link>
          </div>
        </article>
      </div>

      <p className="mt-8 text-[14px] text-subtle wide:mt-10 wide:text-[15px]">
        {fill(copy.plansLine)}{" "}
        <Link href="/for-coaches#plans" className="border-b border-current text-accent">
          Compare plans
        </Link>
      </p>
    </div>
  );
}
