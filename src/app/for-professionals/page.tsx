import type { Metadata } from "next";
import Link from "next/link";
import { ProfessionGlyph, hasGlyph } from "@/components/profession-glyph";
import { RichText } from "@/components/rich-text";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import { horseCareOf } from "@/lib/professions";
import { getPlans } from "@/lib/settings";

/**
 * /for-professionals (The Site as a CMS §06.1): the horse care door's
 * equivalent of /for-coaches. Pick what you do, read the pitch, sign up with
 * the profession already set (/join/[profession]).
 *
 * A profession's own pitch (profession_details.pitch) shows when it has one;
 * until then the horse care pitch block does. Those pitches get written after
 * the first real conversations with each profession, not invented here.
 */
export async function generateMetadata(): Promise<Metadata> {
  const plans = await getPlans();
  return {
    title: "For horse care professionals",
    description: `Farriers, vets, dentists, bodyworkers and the rest list here from ${plans.listed.monthly} a month. Owners contact you directly, and we take no commission.`,
  };
}

export default async function ForProfessionals({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const [all, plans, pitch, lyb] = await Promise.all([getProfessions(), getPlans(), getContent("door.horse_care.pitch"), getContent("list_your_business")]);
  const professions = horseCareOf(all).filter((x) => x.launchState !== "draft");
  const selected = professions.find((x) => x.slug === p);
  const vars = { listed_price: plans.listed.monthly, top_price: plans.clinic.monthly };
  const [titleFirst, ...titleRest] = pitch.title.split("\n");

  return (
    <div data-door="horse-care" className="mx-auto max-w-[1184px] px-[18px] pb-20 pt-12 wide:px-12 wide:pb-[120px] wide:pt-20">
      <p className="fade-in text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">{pitch.eyebrow}</p>
      <h1 className="fade-in mt-3 max-w-[16ch] text-[46px] leading-[0.98] -tracking-[0.02em] text-ink wide:mt-4 wide:text-[80px] wide:leading-[0.94] wide:-tracking-[0.03em]">
        {titleFirst} {titleRest.length > 0 && <em className="text-accent">{titleRest.join(" ")}</em>}
      </h1>
      <p className="fade-in mt-5 max-w-[52ch] text-[17px] leading-[1.5] text-muted wide:mt-7 wide:text-[19px]" style={{ animationDelay: "0.3s" }}>
        <RichText text={fillVariables(selected?.pitch || pitch.body, vars)} />
      </p>

      <h2 className="mt-12 text-[30px] leading-none text-ink wide:mt-16 wide:text-[40px]">What do you do?</h2>
      <ul className="mt-6 grid grid-cols-1 gap-3 min-[640px]:grid-cols-2 wide:grid-cols-4">
        {professions.map((x) => (
          <li key={x.slug}>
            <Link
              href={`/join/${x.slug}`}
              aria-current={selected?.slug === x.slug ? "true" : undefined}
              className={`flex h-full flex-col rounded-[16px] border bg-surface p-5 transition-colors duration-200 hover:border-accent ${selected?.slug === x.slug ? "border-accent" : "border-border"}`}
            >
              {hasGlyph(x.glyphKey) && <ProfessionGlyph slug={x.glyphKey} size={26} className="text-accent" />}
              <span className="mt-3 font-display text-[24px] leading-none text-ink">{x.name}</span>
              <span className="mt-2 flex-1 text-[14px] leading-[1.45] text-muted">{x.blurb}</span>
              <span className="mt-4 text-[14px] font-medium text-accent">Sign up as {/^[aeiou]/i.test(x.singular) ? "an" : "a"} {x.singular} →</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 max-w-[60ch] text-[15px] leading-[1.55] text-subtle">
        {fillVariables(lyb.plansLine, vars)}{" "}
        Teach riding?{" "}
        <Link href="/for-coaches" className="border-b border-current text-accent">
          Coaches have their own page
        </Link>
        .
      </p>
    </div>
  );
}
