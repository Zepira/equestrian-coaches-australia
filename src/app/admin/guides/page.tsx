import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { createGuide } from "./actions";

export const metadata = { title: "Guides" };

/** /admin/guides (M9, Grow): every guide, drafts first. */
export default async function AdminGuidesPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { done, error } = await searchParams;
  const service = createServiceSupabase();
  if (!service) return null;
  const [{ data: guides }, { data: downloads }] = await Promise.all([
    service.from("guides").select("id, title, slug, status, published_at, updated_at").order("status").order("updated_at", { ascending: false }),
    service.from("guide_downloads").select("guide_id"),
  ]);
  const asked = (id: string) => (downloads ?? []).filter((d) => d.guide_id === id).length;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Guides</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          Articles for riders and horse owners at /guides, ideally written with a listed professional. Each one lists professionals near its place and can offer a file by email.
        </p>
      </div>
      {done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{done}</p>}
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}
      <form action={createGuide} className="flex max-w-[560px] gap-2">
        <input name="title" required placeholder="Getting your horse's feet through winter" aria-label="Title" className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg" />
        <Button type="submit">New guide</Button>
      </form>
      <ul className="flex flex-col text-[14px]" data-admin-guides>
        {(guides ?? []).map((g) => (
          <li key={g.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
            <Link href={`/admin/guides/${g.id}`} className="font-medium text-accent">{g.title}</Link>
            <span className="text-subtle">
              {g.status === "published" ? `Live, /guides/${g.slug}` : "Draft"}
              {asked(g.id) ? ` · file sent ${asked(g.id)} times` : ""}
            </span>
          </li>
        ))}
        {(guides ?? []).length === 0 && <li className="text-subtle">None yet.</li>}
      </ul>
    </div>
  );
}
