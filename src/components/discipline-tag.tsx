import Link from "next/link";
import { getDisciplineBySlug } from "@/lib/disciplines";
import { disciplinePath } from "@/lib/page-paths";

export function DisciplineTag({ slug, active = false }: { slug: string; active?: boolean }) {
  const discipline = getDisciplineBySlug(slug);
  if (!discipline) return null;

  return (
    <Link
      href={disciplinePath(slug)}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-surface text-fg hover:border-accent"
      }`}
    >
      {discipline.name}
    </Link>
  );
}
