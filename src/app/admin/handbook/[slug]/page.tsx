import Link from "next/link";
import { notFound } from "next/navigation";
import { getHandbookDoc } from "@/lib/handbook";
import { DocFrame } from "./doc-frame";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getHandbookDoc(slug);
  return { title: doc ? doc.title : "Handbook" };
}

const dateFormat = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function AdminHandbookDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getHandbookDoc(slug);
  if (!doc) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/admin/handbook" className="text-[13px] text-accent hover:underline">
          ← All documents
        </Link>
        <span className="text-[12px] text-subtle">
          Last edited {dateFormat.format(new Date(`${doc.updated}T00:00:00`))}
        </span>
        <a
          href={`/admin/handbook/${doc.slug}/raw`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-[13px] text-accent hover:underline"
        >
          Open full width ↗
        </a>
      </div>

      <DocFrame src={`/admin/handbook/${doc.slug}/raw`} title={doc.title} />
    </div>
  );
}
