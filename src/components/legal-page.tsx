import { fillVariables } from "@/lib/cms/read";
import { countWord } from "@/lib/settings";

/**
 * /terms and /privacy: a content block (legal.terms, legal.privacy) set as a
 * plain reading page. Until an admin marks the legal pages approved
 * (Settings), a notice at the top says it's a draft being checked.
 */
export function LegalPage({
  doc,
  approved,
  vars,
}: {
  doc: { title: string; updated: string; intro: string; sections: { title: string; body: string }[] };
  approved: boolean;
  vars: { founding_price: string; free_months: number; contact_email: string; enquiry_months?: string };
}) {
  const fill = (t: string) => fillVariables(t, { ...vars, free_months: countWord(vars.free_months) });
  return (
    <article className="mx-auto max-w-[760px] px-[18px] pb-20 pt-12 wide:px-0 wide:pb-[120px] wide:pt-20">
      {!approved && (
        <p role="note" className="mb-8 rounded-[14px] border border-border bg-shade px-4 py-3 text-[14px] leading-[1.5] text-fg" data-legal-draft>
          This is a draft. Our solicitor is checking it before the site opens, so parts of it may change.
        </p>
      )}
      <h1 className="text-[46px] leading-[0.98] -tracking-[0.02em] text-ink wide:text-[72px]">{doc.title}</h1>
      <p className="mt-3 text-[14px] text-subtle">{doc.updated}</p>
      <p className="mt-6 text-[18px] leading-[1.55] text-ink wide:text-[20px]">{fill(doc.intro)}</p>
      <div className="mt-10 flex flex-col gap-9">
        {doc.sections.map((s, i) => (
          <section key={s.title} aria-labelledby={`s${i}`}>
            <h2 id={`s${i}`} className="text-[26px] leading-[1.1] text-ink wide:text-[30px]">{s.title}</h2>
            <div className="mt-3 flex flex-col gap-3 text-[16px] leading-[1.6] text-muted wide:text-[17px]">
              {fill(s.body)
                .split(/\n\s*\n/)
                .map((para) => (
                  <p key={para}>{para}</p>
                ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
