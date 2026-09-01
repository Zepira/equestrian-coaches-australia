import Link from "next/link";
import { getDisciplineBySlug } from "@/lib/disciplines";
import { pillToggleClassName } from "@/lib/pill-styles";

export function DisciplineTag({ slug, active = false }: { slug: string; active?: boolean }) {
  const discipline = getDisciplineBySlug(slug);
  if (!discipline) return null;

  return (
    <Link
      href={`/disciplines/${slug}`}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${pillToggleClassName(active)}`}
    >
      {discipline.name}
    </Link>
  );
}
