import Link from "next/link";
import { EMAILS } from "@/lib/cms/registry";

export const metadata = { title: "Emails" };

/** /admin/emails: every email the site sends to people, and who gets it. */
export default function AdminEmailsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Emails</h2>
        <p className="mt-1.5 text-[14px] text-muted">
          The words of every email the site sends. The alerts that go to the two of you (a profile to review, the weekly SEO digest) aren&rsquo;t here: only you read them.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {EMAILS.map((e) => (
          <li key={e.key}>
            <Link href={`/admin/emails/${e.key.slice("email.".length)}`} className="flex flex-col rounded-[14px] border border-border bg-surface p-4 hover:border-accent">
              <span className="font-display text-[20px] leading-none text-ink">{e.name}</span>
              <span className="mt-1.5 text-[13px] text-subtle">
                To {e.to.charAt(0).toLowerCase() + e.to.slice(1)}. {e.when}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
