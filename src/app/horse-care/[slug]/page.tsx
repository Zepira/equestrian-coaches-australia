import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { horseCare, getProfessionBySlug } from "@/lib/professions";

export function generateStaticParams() {
  return horseCare.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profession = getProfessionBySlug(slug);
  if (!profession) return { title: "Horse care" };
  return {
    title: profession.name,
    description: `${profession.blurb} Not open yet on Equine Professionals Australia — riding coaches are live first.`,
    // A holding page has nothing real to rank for, and indexing one is
    // exactly the empty-page mistake the search spec warns about. Remove
    // this when the profession opens with real providers listed.
    robots: { index: false, follow: true },
  };
}

export default async function ProfessionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profession = getProfessionBySlug(slug);
  if (!profession) notFound();

  const others = horseCare.filter((p) => p.slug !== profession.slug);

  return (
    <div className="mx-auto max-w-[760px] px-[18px] py-14 wide:px-12 wide:py-[88px]">
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">
        <Link href="/horse-care" className="border-b border-current">
          Horse care
        </Link>
      </p>
      <h1 className="mt-3 text-[40px] leading-none -tracking-[0.02em] text-ink wide:mt-4 wide:text-[60px] wide:leading-[0.98] wide:-tracking-[0.025em]">
        {profession.name}
      </h1>
      <p className="mt-3.5 text-[17px] leading-[1.5] text-muted wide:mt-5 wide:text-[19px]">{profession.blurb}</p>

      <div className="mt-8 rounded-[16px] border border-border bg-surface p-6 wide:mt-10 wide:p-8">
        <h2 className="text-[24px] leading-none text-ink wide:text-[28px]">Not open yet</h2>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-muted wide:text-[16px]">
          There are no {profession.name.toLowerCase()} listed here, and we would rather say so than show you an
          empty search. Riding coaches are the first profession on Equine Professionals Australia, and each one
          after that opens only when enough real people are listed for the search to be worth using.
        </p>
        <p className="mt-3 text-[15px] leading-[1.5] text-muted wide:text-[16px]">
          If you work as {"aeiou".includes(profession.name[0].toLowerCase()) ? "an" : "a"}{" "}
          {profession.name.toLowerCase().replace(/s$/, "")} and want to know when this opens, email{" "}
          <a href="mailto:hello@equineprofessionals.au" className="text-accent">
            hello@equineprofessionals.au
          </a>
          .
        </p>
        <div className="mt-6">
          <LinkButton href="/coaches">Find a riding coach instead</LinkButton>
        </div>
      </div>

      <h2 className="mt-11 text-[13px] font-medium uppercase tracking-[0.16em] text-subtle wide:mt-14">
        Also coming
      </h2>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {others.map((p) => (
          <li key={p.slug}>
            <Link href={`/horse-care/${p.slug}`} className="font-display text-[22px] text-ink hover:text-accent">
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
