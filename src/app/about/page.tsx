import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { horseCare } from "@/lib/professions";

export const metadata: Metadata = {
  title: "About",
  description:
    "Equine Professionals Australia is a directory of the people who look after Australian horses — starting with riding coaches. Free for riders, no commission, ever.",
};

/**
 * Deliberately says only things that are true today. No founder bios (whose
 * names go on a public page is the founders' call, not the build's), no
 * counts, and nothing implying EPA checks anyone's credentials — the
 * "supplied by the professional" line below is the one that matters, and it
 * is the same promise the terms of service will need to make.
 */
export default function About() {
  return (
    <div className="mx-auto max-w-[760px] px-[18px] py-14 wide:px-12 wide:py-[88px]">
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">About</p>
      <h1 className="mt-3 text-[40px] leading-none -tracking-[0.02em] text-ink wide:mt-4 wide:text-[64px] wide:leading-[0.98] wide:-tracking-[0.025em]">
        The people behind <em className="text-accent">one horse</em>.
      </h1>
      <p className="mt-4 text-[17px] leading-[1.5] text-muted wide:mt-6 wide:text-[20px]">
        Equine Professionals Australia is a directory of the people who keep Australian horses working and well.
        We are starting with riding coaches, and adding the rest of the team from there.
      </p>

      <h2 className="mt-11 text-[28px] leading-none text-ink wide:mt-14 wide:text-[38px]">Why it exists</h2>
      <p className="mt-3 text-[16px] leading-[1.55] text-muted wide:text-[17px]">
        Finding the right coach usually means asking around a Facebook group and hoping someone answers. Coaches
        outside the accredited disciplines are hardest of all to find, because the official registers do not list
        them. So a good coach two suburbs away stays invisible to the rider who needed them.
      </p>
      <p className="mt-3 text-[16px] leading-[1.55] text-muted wide:text-[17px]">
        The same is true of farriers, bodyworkers and everyone else on the list. You need them rarely, urgently,
        and usually at the worst possible moment.
      </p>

      <h2 className="mt-11 text-[28px] leading-none text-ink wide:mt-14 wide:text-[38px]">How it works</h2>
      <ul className="mt-4 flex flex-col">
        {[
          {
            title: "Free for riders, always",
            body: "Searching, browsing and contacting a professional costs nothing, and never will. There is no rider account needed to look.",
          },
          {
            title: "Professionals pay to be listed",
            body: "A coach pays a flat monthly subscription for their profile. That is the whole business model.",
          },
          {
            title: "No commission, ever",
            body: "We never take a percentage of a lesson or a callout. You deal with your coach direct, the way riders always have.",
          },
          {
            title: "We do not vet or accredit anyone",
            body: "Every qualification, photo and description is supplied by the professional themselves. We do not check them, and we never describe anyone as verified or recommended. Ask for credentials the same way you would with any other professional.",
          },
        ].map((item) => (
          <li key={item.title} className="border-t border-border py-4 wide:py-5">
            <span className="block text-[17px] font-semibold text-fg wide:text-[18px]">{item.title}</span>
            <span className="mt-1.5 block text-[15px] leading-[1.5] text-muted wide:text-[16px]">{item.body}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-11 text-[28px] leading-none text-ink wide:mt-14 wide:text-[38px]">What is coming</h2>
      <p className="mt-3 text-[16px] leading-[1.55] text-muted wide:text-[17px]">
        Riding coaches are live. {horseCare.map((p) => p.name).join(", ")} are the professions we are building
        toward, and each one opens only when enough real people are listed for the search to be worth using. An
        empty category helps nobody.
      </p>

      <div className="mt-10 flex flex-col gap-2.5 wide:mt-12 wide:flex-row">
        <LinkButton href="/coaches">Find a coach</LinkButton>
        <LinkButton href="/for-coaches" variant="secondary">
          List your profile
        </LinkButton>
      </div>

      <p className="mt-9 text-[15px] leading-[1.5] text-muted">
        Questions?{" "}
        <a href="mailto:hello@equineprofessionals.au" className="text-accent">
          hello@equineprofessionals.au
        </a>
        , or read more about{" "}
        <Link href="/horse-care" className="text-accent">
          the professions we are adding
        </Link>
        .
      </p>
    </div>
  );
}
