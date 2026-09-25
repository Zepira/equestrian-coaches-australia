import Link from "next/link";

/** "How this list is ordered", beside every results list (The Marketing Engine §05.8). */
export function HowWeListLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/how-we-list" className={`text-[13px] text-subtle underline underline-offset-2 hover:text-fg ${className}`} data-how-we-list>
      How this list is ordered
    </Link>
  );
}
