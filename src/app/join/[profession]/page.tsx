import { notFound, redirect } from "next/navigation";
import { getProfession } from "@/lib/cms/read";

/**
 * /join/[profession]: the short link Kim puts in her messages
 * (/join/farriers). Sends the visitor to sign-up with the profession set and
 * every tracking parameter carried over (plan, ref, utm tags, invite), so
 * the link teaches the site's shape and still records where the sign-up
 * came from. A profession in draft is open to invites only.
 */
const CARRY = ["plan", "tier", "ref", "utm_source", "utm_medium", "utm_campaign", "invite", "referral", "promo"] as const;

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ profession: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { profession: slug } = await params;
  const sp = await searchParams;
  const profession = await getProfession(slug);
  if (!profession || (profession.launchState === "draft" && !sp.invite)) notFound();
  const next = new URLSearchParams({ profession: profession.slug });
  for (const key of CARRY) if (sp[key]) next.set(key, String(sp[key]));
  redirect(`/signup?${next.toString()}`);
}
