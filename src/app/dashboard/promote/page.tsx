import { redirect } from "next/navigation";
import { loadDashboard } from "@/lib/dashboard";
import { createServiceSupabase } from "@/lib/supabase/service";
import { shareKitLinks, type KitKind } from "@/lib/share-kit";
import { absoluteUrl } from "@/lib/site-url";
import { getReferralCapPerYear, getReferralRewardMonths } from "@/lib/settings";
import { countWord } from "@/lib/settings";
import { CopyField } from "@/components/copy-field";

export const metadata = { title: "Promote yourself", robots: { index: false, follow: false } };

const STATUS: Record<string, string> = {
  joined: "joined, not paying yet",
  paid: "paying",
  rewarded: "paying, your month's credited",
  capped: "paying (over this year's limit)",
};

/**
 * "Promote yourself" (The Marketing Engine M4 and M6): everything a
 * professional can hand out, each carrying their own tracked link so this
 * page shows what each piece brought. And the colleague referral: their link,
 * the message to send (which says what they get), and who's joined.
 */
export default async function PromotePage() {
  const ctx = await loadDashboard();
  if (!ctx) redirect("/login?next=/dashboard/promote");
  const service = createServiceSupabase();
  if (!service) return null;
  const { provider, professions, firstName } = ctx;
  const profession = professions[0];
  const slug = provider.slug as string;
  const published = provider.status === "published";
  const [links, months, cap, { data: code }, { data: referrals }] = await Promise.all([
    shareKitLinks(service, { id: ctx.providerId, slug }),
    getReferralRewardMonths(),
    getReferralCapPerYear(),
    service.from("providers").select("referral_code").eq("id", ctx.providerId).single(),
    service.from("referrals").select("status, created_at, referee:providers!referrals_referee_provider_id_fkey(name)").eq("referrer_provider_id", ctx.providerId).order("created_at", { ascending: false }),
  ]);
  const go = (k: KitKind) => absoluteUrl(`/go/${links.find((l) => l.kind === k)?.slug}`);
  const count = (k: KitKind) => {
    const l = links.find((x) => x.kind === k);
    return l ? `${l.recent} visit${l.recent === 1 ? "" : "s"} in 30 days, ${l.clicks} in all` : "";
  };
  const founding = provider.cohort === "founding";
  const referralUrl = absoluteUrl(`/join/${profession.slug}?referral=${code?.referral_code ?? ""}`);
  const monthsWord = countWord(months);
  const message = `I list my ${profession.singular} work on Equine Professionals Australia, a directory riders and horse owners search by what they need and where they are. If you join with my link, your first month is free, and I get ${monthsWord} free month${months === 1 ? "" : "s"} once you're on a paid plan: ${referralUrl}`;
  const signature = `${provider.name}\n${profession.singular.charAt(0).toUpperCase()}${profession.singular.slice(1)}${provider.suburb ? `, ${provider.suburb} ${provider.state}` : ""}\nFind me on Equine Professionals Australia: ${go("signature")}`;
  const badge = `<a href="${go("badge")}"><img src="${absoluteUrl(`/api/badge/${slug}`)}" alt="Find ${provider.name} on Equine Professionals Australia" width="240" height="64"></a>`;
  const card = "rounded-[16px] border border-border bg-surface p-4 wide:p-5";
  const h = "font-display text-[22px] leading-none text-ink";
  const note = "mt-1.5 text-[13px] leading-[1.5] text-subtle";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[34px] leading-none text-ink wide:text-[40px]">Promote yourself</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-[1.5] text-muted">
          Things to hand out and post, {firstName}. Each one uses its own link, so you can see below which brought people to your profile.
        </p>
        {!published && <p className="mt-3 rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">These work once your profile is live. You can get them ready now.</p>}
      </div>

      <section className={card} data-kit="follow">
        <h2 className={h}>Your clinic dates, by email</h2>
        <p className={note}>
          Send this to your {profession.audienceNoun}s. They give their email once and hear whenever you list a {profession.slug === "coaches" ? "clinic" : "clinic or event"}. {count("follow")}.
        </p>
        <div className="mt-3"><CopyField value={go("follow")} label="Follow link" /></div>
      </section>

      <section className={card} data-kit="share">
        <h2 className={h}>Share images</h2>
        <p className={note}>For Facebook and Instagram posts and stories. {count("share")}.</p>
        <div className="mt-3 flex flex-wrap gap-3 text-[14px]">
          <a href={`/api/og/profile/${slug}?format=square${founding ? "&founding=1" : ""}`} download className="font-medium text-accent">Square, for posts</a>
          <a href={`/api/og/profile/${slug}?format=story${founding ? "&founding=1" : ""}`} download className="font-medium text-accent">Tall, for stories</a>
          <a href={`/api/og/profile/${slug}?format=og${founding ? "&founding=1" : ""}`} download className="font-medium text-accent">Wide</a>
        </div>
        {founding && <p className={note}>These carry a &ldquo;Founding member&rdquo; ribbon.</p>}
        <p className="mt-3 text-[14px]">Link to put with the post:</p>
        <div className="mt-1.5"><CopyField value={go("share")} label="Share link" /></div>
      </section>

      <section className={card} data-kit="print">
        <h2 className={h}>To print</h2>
        <p className={note}>An A4 poster with a QR code for the stable noticeboard or the tack room, and a business card. Poster: {count("poster")}. Card: {count("card")}.</p>
        <div className="mt-3 flex flex-wrap gap-4 text-[14px]">
          <a href="/api/print/poster" download className="font-medium text-accent">Poster (PDF)</a>
          <a href="/api/print/card" download className="font-medium text-accent">Business card (PDF)</a>
        </div>
      </section>

      <section className={card} data-kit="badge">
        <h2 className={h}>For your website</h2>
        <p className={note}>Paste this where you want the badge to show. {count("badge")}.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/badge/${slug}`} alt="" width={240} height={64} className="mt-3" />
        <div className="mt-3"><CopyField value={badge} label="Badge code" multiline /></div>
      </section>

      <section className={card} data-kit="signature">
        <h2 className={h}>Email signature</h2>
        <p className={note}>{count("signature")}.</p>
        <div className="mt-3"><CopyField value={signature} label="Email signature" multiline /></div>
      </section>

      <section className={card} data-referrals>
        <h2 className={h}>Invite a colleague</h2>
        <p className={note}>
          Know a good {profession.singular}, or a farrier, bodyworker or anyone else your clients use? Send them your link. They get their first month free, and once they&rsquo;re paying you get {monthsWord} free month{months === 1 ? "" : "s"}, up to {cap} a year. Send it yourself, by text or email; we don&rsquo;t email people on your behalf.
        </p>
        <p className="mt-3 text-[14px]">Your code: <strong className="font-mono">{code?.referral_code}</strong></p>
        <div className="mt-2"><CopyField value={message} label="Message to send" multiline /></div>
        <h3 className="mt-5 text-[15px] font-semibold text-fg">Who&rsquo;s joined</h3>
        {(referrals ?? []).length === 0 ? (
          <p className={note}>Nobody yet.</p>
        ) : (
          <ul className="mt-2 text-[14px]">
            {(referrals ?? []).map((r, i) => (
              <li key={i} className="flex justify-between border-b border-border py-1.5">
                <span className="text-fg">{(r as unknown as { referee: { name: string } | null }).referee?.name ?? "Someone"}</span>
                <span className="text-subtle">{STATUS[r.status] ?? r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
