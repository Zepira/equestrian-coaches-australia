import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase/public";
import { SubscribeCard } from "@/components/subscribe-card";
import { profilePath } from "@/lib/page-paths";

/**
 * /profile/[slug]/follow (The Marketing Engine M4): the link a professional
 * sends their own clients, "Get my clinic dates by email". One screen: an
 * email and the consent words, and the follower hears about that person's
 * events wherever they are. Every coach's students become riders on the
 * list this way, and then see the farrier and the dentist too.
 */
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const db = createPublicSupabase();
  if (!db) return null;
  const { data } = await db.from("providers").select("id, slug, name, suburb, state").eq("slug", slug).eq("status", "published").maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  return { title: `Get ${p.name.split(" ")[0]}'s clinic dates by email`, robots: { index: false, follow: true } };
}

export default async function FollowPage({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const first = String(p.name).split(" ")[0];
  return (
    <div className="mx-auto max-w-[640px] px-[18px] pb-20 pt-12 wide:pt-20" data-follow={p.slug}>
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent">Clinics and events</p>
      <h1 className="mt-3 text-[44px] leading-[1] -tracking-[0.02em] text-ink wide:text-[60px]">
        Get {first}&rsquo;s dates <em className="text-accent">by email</em>
      </h1>
      <p className="mt-5 text-[17px] leading-[1.55] text-muted">
        We&rsquo;ll email you when {p.name} lists a clinic or event, wherever it is. Nothing else, unless you ask.
      </p>
      <div className="mt-8">
        <SubscribeCard heading={`Follow ${first}`} what={`${p.name} lists an event`} providerId={p.id} source={`follow:${p.slug}`} />
      </div>
      <p className="mt-6 text-[14px] text-subtle">
        <Link href={profilePath(p.slug)} className="underline underline-offset-2 hover:text-fg">
          See {first}&rsquo;s profile
        </Link>
      </p>
    </div>
  );
}
