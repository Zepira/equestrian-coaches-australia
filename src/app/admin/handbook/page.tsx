import Link from "next/link";
import { HANDBOOK_DOCS, type HandbookAudience } from "@/lib/handbook";

export const metadata = { title: "Handbook" };

const audienceBadge: Record<HandbookAudience, { label: string; className: string }> = {
  Both: { label: "Kim & Alana", className: "border-ink/25 text-ink" },
  Kim: { label: "For Kim", className: "border-accent/35 text-accent" },
  Build: { label: "Build spec", className: "border-subtle/35 text-subtle" },
};

const dateFormat = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function AdminHandbookPage() {
  const docs = HANDBOOK_DOCS;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="font-display text-[26px] leading-none text-ink">
          {docs.length} documents
        </h2>
        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          The planning documents Kim and Alana work from. These live in the repo at{" "}
          <code className="text-[13px] text-subtle">content/handbook/</code>, which makes this
          the single source of truth — git keeps the history, and there is no second copy to
          go stale.
        </p>
      </section>

      <div className="flex flex-col gap-2">
        {docs.map((doc) => (
          <Link
            key={doc.slug}
            href={`/admin/handbook/${doc.slug}`}
            className="group flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-4 py-4 transition-colors hover:border-accent"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                {doc.kicker}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${audienceBadge[doc.audience].className}`}
              >
                {audienceBadge[doc.audience].label}
              </span>
              <span className="ml-auto text-[12px] text-subtle">
                Updated {dateFormat.format(new Date(`${doc.updated}T00:00:00`))}
              </span>
            </div>

            <h3 className="font-display text-[22px] leading-tight text-ink group-hover:text-accent">
              {doc.title}
            </h3>
            <p className="max-w-[68ch] text-[14px] leading-[1.5] text-muted">{doc.summary}</p>
          </Link>
        ))}
      </div>

      <p className="text-[13px] leading-[1.6] text-subtle">
        To change one, edit its file in{" "}
        <code className="text-[12px]">content/handbook/</code> and deploy. To add one, drop the
        HTML in that folder and add a row to{" "}
        <code className="text-[12px]">src/lib/handbook.ts</code>.
      </p>
    </div>
  );
}
