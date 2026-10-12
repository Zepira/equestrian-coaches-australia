import { LegalText } from "@/components/legal-text";
import { fillVariables } from "@/lib/cms/read";
import { countWord } from "@/lib/settings";

/**
 * /terms, /privacy, /cookies and /refunds: a content block (legal.*) set as
 * a plain reading page. Until an admin marks the legal pages approved
 * (Settings), a notice at the top says it's a draft being checked.
 *
 * Bodies are plain text: a blank line starts a paragraph, a paragraph whose
 * lines all start with "- " is a bullet list, and the site's own legal paths
 * and oaic.gov.au become links. Nothing else is interpreted.
 */
export type LegalDoc = { title: string; updated?: string; intro: string; sections: { title: string; body: string }[] };

export type LegalVars = {
  contact_email: string;
  abn?: string;
  founding_price?: string;
  free_months?: number;
  enquiry_months?: string;
  pause_max_months?: string;
};

export function LegalBody({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((para) => {
        const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0 && lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={para} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-subtle">
              {lines.map((l) => (
                <li key={l}><LegalText text={l.slice(2)} /></li>
              ))}
            </ul>
          );
        }
        return <p key={para}><LegalText text={para} /></p>;
      })}
    </>
  );
}

export function fillLegal(text: string, vars: LegalVars) {
  const { free_months, ...rest } = vars;
  return fillVariables(text, {
    ...(rest as Record<string, string>),
    ...(free_months !== undefined && { free_months: countWord(free_months) }),
  });
}

export function LegalPage({ doc, approved, vars }: { doc: LegalDoc; approved: boolean; vars: LegalVars }) {
  const fill = (t: string) => fillLegal(t, vars);
  return (
    <article className="mx-auto max-w-[760px] px-[18px] pb-20 pt-12 wide:px-0 wide:pb-[120px] wide:pt-20">
      {!approved && (
        <p role="note" className="mb-8 rounded-[14px] border border-border bg-shade px-4 py-3 text-[14px] leading-[1.5] text-fg" data-legal-draft>
          This is a draft. Our solicitor is checking it before the site opens, so parts of it may change.
        </p>
      )}
      <h1 className="text-[46px] leading-[0.98] -tracking-[0.02em] text-ink wide:text-[72px]">{doc.title}</h1>
      {doc.updated && <p className="mt-3 text-[14px] text-subtle">{doc.updated}</p>}
      <p className="mt-6 text-[18px] leading-[1.55] text-ink wide:text-[20px]">{fill(doc.intro)}</p>
      <div className="mt-10 flex flex-col gap-9">
        {doc.sections.map((s, i) => (
          <section key={s.title} aria-labelledby={`s${i}`}>
            <h2 id={`s${i}`} className="text-[26px] leading-[1.1] text-ink wide:text-[30px]">{s.title}</h2>
            <div className="mt-3 flex flex-col gap-3 text-[16px] leading-[1.6] text-muted wide:text-[17px]">
              <LegalBody text={fill(s.body)} />
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
