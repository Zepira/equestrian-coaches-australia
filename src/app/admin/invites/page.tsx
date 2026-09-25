import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { getProfessions } from "@/lib/cms/read";
import { absoluteUrl } from "@/lib/site-url";
import { profilePath } from "@/lib/page-paths";
import { createInvite, renewInvite } from "./actions";

export const metadata = { title: "Invites" };

type Invite = {
  id: string;
  token: string;
  name: string;
  email: string;
  source: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  terms: { slug: string; name: string } | null;
  providers: { slug: string; status: string } | null;
};

const day = (iso: string) => new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Melbourne" }).format(new Date(iso));

/**
 * Invites (The Site as a CMS §06.6): who to invite, what they do, and
 * optionally a start on their profile. The link goes out in your own message;
 * it opens a filled-in sign-up, works once and lasts 30 days.
 */
export default async function InvitesPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const { created, error } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: me }, professions, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user?.id ?? "").maybeSingle(),
    getProfessions(),
    supabase
      .from("invites")
      .select("id, token, name, email, source, created_at, expires_at, used_at, terms(slug, name), providers:providers!invites_provider_fk(slug, status)")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  const input = "w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-fg";

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="font-display text-[26px] leading-none text-ink">Invite someone</h2>
        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          You get a link to put in your own message. It opens the sign-up with their name, email and work filled in. Nothing goes public until they finish their profile and it passes review.
        </p>
        {created && <p className="mt-3 rounded-[12px] bg-accent-soft px-3 py-2 text-sm text-fg">Invite made. Copy the link from the list below.</p>}
        {error && <p className="mt-3 rounded-[12px] bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <form action={createInvite} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Name</span>
            <input name="name" required className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Email</span>
            <input name="email" type="email" required className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">What they do</span>
            <select name="profession_id" required className={input}>
              {professions.map((p) => (
                <option key={p.slug} value={p.id ?? ""}>
                  {p.name}
                  {p.launchState === "draft" ? " (not open yet)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Who&apos;s inviting</span>
            <input name="source" defaultValue={me?.name?.split(" ")[0] ?? ""} className={input} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-fg">Where their business email is published</span>
            <input name="address_source_url" type="url" required placeholder="https://their-website.com.au/contact" className={input} />
            <span className="mt-1 block text-[12.5px] text-subtle">
              The law lets us invite someone without asking first only when their business address is published and nothing there says no marketing. Their website or business page, not a personal post.
            </span>
          </label>
          <p className="text-sm text-muted sm:col-span-2">Optional: start their profile with what you already know. They can change all of it.</p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">One line about what they do</span>
            <input name="headline" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Business name</span>
            <input name="business_name" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Suburb</span>
            <input name="suburb" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">State</span>
            <input name="state" maxLength={3} className={input} />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Make the invite</Button>
          </div>
        </form>
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[26px] leading-none text-ink">Sent</h2>
        {(invites ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">None yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {((invites ?? []) as unknown as Invite[]).map((i) => {
              const expired = !i.used_at && new Date(i.expires_at) < new Date();
              const link = absoluteUrl(`/join/${i.terms?.slug ?? "coaches"}?invite=${i.token}`);
              return (
                <li key={i.id} className="rounded-[12px] border border-border bg-surface px-3 py-2.5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>
                      <span className="font-medium text-fg">{i.name || i.email}</span> <span className="text-muted">· {i.terms?.name ?? "?"} · by {i.source}</span>
                    </span>
                    <span className="text-xs text-muted">
                      {i.used_at ? (
                        <>
                          Signed up {day(i.used_at)}
                          {i.providers ? (
                            <>
                              {" "}
                              ·{" "}
                              <Link href={`${profilePath(i.providers.slug)}?preview=1`} className="text-accent">
                                {i.providers.status.replace("_", " ")}
                              </Link>
                            </>
                          ) : null}
                        </>
                      ) : expired ? (
                        `Expired ${day(i.expires_at)}`
                      ) : (
                        `Waiting · until ${day(i.expires_at)}`
                      )}
                    </span>
                  </div>
                  {!i.used_at && (
                    <div className="mt-2 flex items-center gap-2">
                      {!expired && <input readOnly value={link} aria-label={`Invite link for ${i.name || i.email}`} className="w-full rounded-[8px] bg-shade px-2 py-1.5 font-mono text-xs text-fg" />}
                      <form action={renewInvite.bind(null, i.id)}>
                        <button className="whitespace-nowrap text-xs font-medium text-accent">{expired ? "Renew for 30 days" : "Another 30 days"}</button>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
