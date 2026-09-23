import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { horseCare } from "@/lib/professions";

export const metadata: Metadata = {
  title: "Horse care",
  description:
    "Farriers, vets, physiotherapists, bodyworkers and the rest of the team behind one horse. Not open yet — riding coaches are live first.",
  // Nothing here is listable yet, so there is nothing for a crawler to
  // index. Drop this once a profession opens with real providers on it.
  robots: { index: false, follow: true },
};

export default function HorseCareIndex() {
  return (
    <div className="mx-auto max-w-[1184px] px-[18px] py-14 wide:px-12 wide:py-[88px]">
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">
        Horse care
      </p>
      <h1 className="mt-3 text-[40px] leading-none -tracking-[0.02em] text-ink wide:mt-4 wide:text-[64px] wide:leading-[0.98] wide:-tracking-[0.025em]">
        The rest of the <em className="text-accent">team</em>.
      </h1>
      <p className="mt-3.5 max-w-[52ch] text-[16px] leading-[1.5] text-muted wide:mt-5 wide:text-[18px]">
        One horse needs more than a coach. These are the professions Equine Professionals Australia is built to
        cover. <strong className="font-semibold text-fg">None of them are open yet</strong> — riding coaches are
        live first, and each profession opens only when there are enough real people listed for the search to be
        worth using.
      </p>

      <ul className="mt-9 grid grid-cols-1 gap-3.5 wide:mt-12 wide:grid-cols-3 wide:gap-5">
        {horseCare.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/horse-care/${p.slug}`}
              className="lift block h-full rounded-[16px] border border-border bg-surface p-5 wide:p-6"
            >
              <span className="block font-display text-[26px] leading-none text-ink wide:text-[30px]">{p.name}</span>
              <span className="mt-2 block text-[14px] leading-[1.45] text-muted wide:text-[15px]">{p.blurb}</span>
              <span className="mt-3.5 block text-[13px] font-medium text-accent">Not open yet →</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-11 rounded-[16px] bg-shade p-6 wide:mt-14 wide:p-9">
        <h2 className="text-[26px] leading-none text-ink wide:text-[34px]">Coaches are live now</h2>
        <p className="mt-2.5 max-w-[48ch] text-[15px] leading-[1.5] text-muted wide:text-[16px]">
          Riding coaches across Australia, searchable by discipline and location. Free for riders, always.
        </p>
        <div className="mt-5">
          <LinkButton href="/coaches">Find a coach</LinkButton>
        </div>
      </div>
    </div>
  );
}
