import Link from "next/link";
import { notFound } from "next/navigation";
import { emailBySlug } from "@/lib/cms/registry";
import { CONTENT_DEFAULTS } from "@/lib/cms/content-defaults";
import { sameShape } from "@/lib/cms/read";
import { createClient } from "@/lib/supabase/server";
import { whoNames } from "@/lib/admin";
import { ContentEditor, type EditorBlock } from "../../content-editor";
import { HistoryList } from "../../history-list";
import { saveEmail, sendTestEmail } from "../../pages/actions";

export const metadata = { title: "Edit email" };

const HINTS = {
  subject: "The subject line.",
  body: "Blank lines split paragraphs. Use the variables on the right.",
  footer: "Keep the unsubscribe link: the law needs it in every alert.",
};

export default async function AdminEmailEdit({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const email = emailBySlug(slug);
  const supabase = await createClient();
  if (!email || !supabase) notFound();

  const [{ data: row }, { data: history }] = await Promise.all([
    supabase.from("content_blocks").select("value").eq("key", email.key).maybeSingle(),
    supabase.from("content_history").select("changed_by, changed_at").eq("key", email.key).order("changed_at", { ascending: false }).limit(20),
  ]);
  const def = CONTENT_DEFAULTS[email.key];
  const block: EditorBlock = {
    key: email.key,
    name: email.name,
    def: def as EditorBlock["def"],
    value: (row && sameShape(row.value, def) ? row.value : def) as EditorBlock["value"],
  };
  const names = await whoNames(supabase, (history ?? []).map((r) => r.changed_by));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/emails" className="text-[13px] text-subtle hover:text-fg">← All emails</Link>
        <h2 className="mt-2 font-display text-[30px] leading-none text-ink">{email.name}</h2>
        <p className="mt-1.5 text-[14px] text-muted">
          To {email.to.charAt(0).toLowerCase() + email.to.slice(1)}. {email.when}
        </p>
        <p className="mt-2 text-[13px] text-subtle" data-email-class={email.class}>
          {email.class === "commercial"
            ? "Commercial: it only goes to people who agreed to it, and the site adds who we are, our ABN and the unsubscribe links to the bottom."
            : "Factual: it goes to everyone it concerns, so it can't promote anything. Upgrades, referrals and news belong in a commercial email."}
        </p>
      </div>
      <div className="grid gap-6 wide:grid-cols-[1fr_300px] wide:items-start">
        <ContentEditor blocks={[block]} hints={HINTS} action={saveEmail.bind(null, slug)} testAction={sendTestEmail.bind(null, slug)} />
        <aside className="rounded-[16px] border border-border bg-shade p-4 wide:sticky wide:top-24" data-variables>
          <h3 className="font-display text-[18px] leading-none text-ink">Variables</h3>
          <p className="mt-1.5 text-[13px] text-subtle">Written in curly brackets. The test fills them with these samples.</p>
          <dl className="mt-3 flex flex-col gap-2.5 text-[13px]">
            {email.vars.map((v) => (
              <div key={v.name}>
                <dt className="font-mono text-[12px] text-fg">{`{${v.name}}`}</dt>
                <dd className="text-muted">{v.what}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
      <HistoryList rows={(history ?? []).map((r) => ({ when: r.changed_at, who: names.get(r.changed_by) ?? null, what: `Changed ${email.name}` }))} />
    </div>
  );
}
