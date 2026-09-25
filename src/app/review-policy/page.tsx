import type { Metadata } from "next";
import { getContent } from "@/lib/cms/read";

export const metadata: Metadata = {
  title: "Our review policy",
  description: "How reviews get onto profiles on Equine Professionals Australia, what we take down and what we never take down.",
};

/**
 * /review-policy (The Marketing Engine §05.7): what the ACCC expects a review
 * platform to publish. Linked from every review and every review form; words
 * in the review_policy block (Admin → Pages).
 */
export default async function ReviewPolicyPage() {
  const doc = await getContent("review_policy");
  return (
    <article className="mx-auto max-w-[760px] px-[18px] pb-20 pt-12 wide:px-0 wide:pb-[120px] wide:pt-20">
      <h1 className="text-[46px] leading-[0.98] -tracking-[0.02em] text-ink wide:text-[72px]">{doc.title}</h1>
      <p className="mt-6 text-[18px] leading-[1.55] text-ink wide:text-[20px]">{doc.intro}</p>
      <div className="mt-10 flex flex-col gap-9">
        {doc.sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-[26px] leading-[1.1] text-ink wide:text-[30px]">{s.title}</h2>
            <p className="mt-3 text-[16px] leading-[1.6] text-muted wide:text-[17px]">{s.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
