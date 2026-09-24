import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOCK_NAMES, FIELD_HINTS, pageBySlug } from "@/lib/cms/registry";
import { CONTENT_DEFAULTS } from "@/lib/cms/content-defaults";
import { sameShape } from "@/lib/cms/read";
import { createClient } from "@/lib/supabase/server";
import { whoNames } from "@/lib/admin";
import { ContentEditor, type EditorBlock } from "../../content-editor";
import { HistoryList } from "../../history-list";
import { savePage } from "../actions";

export const metadata = { title: "Edit page" };

export default async function AdminPageEdit({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pageBySlug(slug);
  const supabase = await createClient();
  if (!page || !supabase) notFound();

  const [{ data: rows }, { data: history }] = await Promise.all([
    supabase.from("content_blocks").select("key, value").in("key", page.keys),
    supabase.from("content_history").select("key, changed_by, changed_at").in("key", page.keys).order("changed_at", { ascending: false }).limit(20),
  ]);
  const stored = new Map((rows ?? []).map((r) => [r.key as string, r.value]));
  const blocks: EditorBlock[] = page.keys.map((key) => {
    const def = CONTENT_DEFAULTS[key];
    const value = stored.get(key);
    return { key, name: BLOCK_NAMES[key] ?? key, def: def as EditorBlock["def"], value: (value !== undefined && sameShape(value, def) ? value : def) as EditorBlock["value"] };
  });
  const names = await whoNames(supabase, (history ?? []).map((r) => r.changed_by));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/pages" className="text-[13px] text-subtle hover:text-fg">← All pages</Link>
        <h2 className="mt-2 font-display text-[30px] leading-none text-ink">{page.name}</h2>
        <p className="mt-1.5 text-[13px] text-subtle">
          <Link href={page.href} target="_blank" className="text-accent underline-offset-2 hover:underline">View it</Link>
          {page.note && <> · {page.note}</>}
        </p>
        <p className="mt-2 text-[13px] text-subtle">
          Prices are written as {"{listed_price}"} and {"{top_price}"} where they appear, so they follow the Plans tab.
        </p>
      </div>
      <ContentEditor blocks={blocks} hints={FIELD_HINTS} action={savePage.bind(null, slug)} />
      <HistoryList rows={(history ?? []).map((r) => ({ when: r.changed_at, who: names.get(r.changed_by) ?? null, what: `Changed ${BLOCK_NAMES[r.key as keyof typeof BLOCK_NAMES] ?? r.key}` }))} />
    </div>
  );
}
