import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveLocation } from "@/lib/supabase/queries";
import { getProfessions } from "@/lib/cms/read";
import { getSectionTerms } from "@/lib/sections";
import { deleteAlert, removeFavourite, setAlertActive } from "./actions";
import { AlertForm, type AlertConsent, type AlertDefaults, type AlertProfession } from "./alert-form";
import { consentStatus, currentWording } from "@/lib/audience";
import { createServiceSupabase } from "@/lib/supabase/service";
import { eventPath, profilePath } from "@/lib/page-paths";

export const metadata = { title: "My account", robots: { index: false, follow: false } };

type Favourite = {
  coachId: string;
  slug: string;
  name: string;
  headline: string;
  where: string;
  tags: string[];
  photoUrl: string | null;
};
type Sent = { id: string; coachName: string; want: string; when: string; status: "new" | "replied" | "booked" | "no_response" };
type Nearby = { id: string; title: string; day: number; mon: string; who: string; where: string };

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WANT: Record<string, string> = { regular: "Regular lessons", one_off: "One-off", clinic: "Clinic" };
// Rider-side reading of the coach's status (canvas: Replied / Awaiting reply).
const STATUS: Record<Sent["status"], { label: string; cls: string }> = {
  new: { label: "Awaiting reply", cls: "bg-shade text-subtle" },
  replied: { label: "Replied", cls: "bg-[#e6efe8] text-ink" },
  booked: { label: "Booked", cls: "bg-ink text-ink-fg" },
  no_response: { label: "No response", cls: "bg-shade text-subtle" },
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

/**
 * Rider account (canvas: Dashboards 1c/1d). One DOM for both widths: the
 * two desktop columns are `display: contents` wrappers on phones, so the
 * five blocks fall into the canvas's phone order via `order-*` and into
 * two flex columns from `wide:` up.
 */
type AlertRow = {
  id: string;
  suburb: string | null;
  postcode: string | null;
  radius_km: number;
  door: string | null;
  profession_ids: string[];
  term_ids: string[];
  wants_events: boolean;
  wants_new_providers: boolean;
  unsubscribed_at: string | null;
  provider_id: string | null;
  providers: { name: string; slug: string } | null;
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; alerts?: string; location?: string; d?: string; p?: string; alert_error?: string }>;
}) {
  const sp = await searchParams;
  const { saved } = sp;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/account");

  const [{ data: profile }, allProfessions, { data: alertRows }, { data: favouriteRows }, { data: sentRows }, { data: nearbyRows }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    getProfessions(),
    supabase
      .from("rider_alerts")
      .select("id, suburb, postcode, radius_km, door, profession_ids, term_ids, wants_events, wants_new_providers, unsubscribed_at, provider_id, providers(name, slug)")
      .eq("rider_id", user.id)
      .order("created_at"),
    supabase
      .from("favourites")
      .select("provider_id, created_at, providers(slug, name, headline, suburb, state, lat, long, provider_terms(sort_order, terms(name, kind)), provider_photos(storage_path, sort_order))")
      .eq("rider_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("enquiries").select("id, want, status, created_at, providers(name)").eq("rider_id", user.id).order("created_at", { ascending: false }),
    supabase.rpc("events_for_rider", { p_rider_id: user.id }),
  ]);

  const firstName = (profile?.name ?? user.user_metadata?.name ?? "there").split(" ")[0];
  const alerts = (alertRows ?? []) as unknown as AlertRow[];
  // Distances to saved profiles are measured from the first live alert's place.
  const firstAlert = alerts.find((a) => !a.unsubscribed_at) ?? alerts[0];
  const savedArea = firstAlert ? [firstAlert.suburb, firstAlert.postcode].filter(Boolean).join(" ") : "";
  const home = savedArea ? await resolveLocation(supabase, savedArea) : null;

  // Every profession a rider can follow, with its disciplines or specialities.
  const professions: AlertProfession[] = await Promise.all(
    allProfessions
      .filter((p) => p.open && p.id)
      .map(async (p) => ({
        id: p.id!,
        slug: p.slug,
        name: p.name,
        singular: p.singular,
        termNounPlural: p.termNounPlural,
        door: p.door,
        terms: (await getSectionTerms(p.id)).map((t) => ({ id: t.id, slug: t.slug, name: t.name })),
      }))
  );
  const describe = (a: AlertRow) => {
    // A follow alert: one professional's events, wherever they are (M4).
    if (a.provider_id) return { who: `${a.providers?.name ?? "A professional"}'s clinics and events`, where: "Wherever they are", what: "their events" };
    const prof = professions.find((p) => a.profession_ids.includes(p.id));
    const who = prof ? prof.name : a.door === "horse_care" ? "All horse care" : a.door === "coaches" ? "Riding coaches" : "Everyone";
    const terms = prof ? prof.terms.filter((t) => a.term_ids.includes(t.id)).map((t) => t.name) : [];
    const what = [a.wants_events && "clinics and events", a.wants_new_providers && "new people"].filter(Boolean).join(" and ");
    const place = [a.suburb, a.postcode].filter(Boolean).join(" ") || "?";
    return { who: terms.length ? `${who}: ${terms.join(", ")}` : who, where: `${place}, within ${a.radius_km} km`, what };
  };
  const toDefaults = (a: AlertRow): AlertDefaults => ({
    id: a.id,
    place: [a.suburb, a.postcode].filter(Boolean).join(" "),
    radiusKm: a.radius_km,
    who: a.profession_ids[0] ? `p:${a.profession_ids[0]}` : a.door ? `door:${a.door}` : "",
    termIds: a.term_ids,
    wantsEvents: a.wants_events,
    wantsNewProviders: a.wants_new_providers,
  });
  // "Notify me" from a search arrives as ?alerts=1&location=…&p=…&d=… and opens a filled-in form.
  const fromSearch = sp.alerts === "1";
  const searchProfession = professions.find((p) => p.slug === (sp.p || "coaches"));
  const searchTerm = sp.d ? searchProfession?.terms.find((t) => t.slug === sp.d) : undefined;
  // The words the alert form shows, and whether the round-up is already on (M1).
  const service = createServiceSupabase();
  const [alertsWording, newsWording, contactRow] = await Promise.all([
    currentWording(supabase, "rider_alerts"),
    currentWording(supabase, "rider_news"),
    service ? service.from("contacts").select("id, token").eq("profile_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const newsOn = service && contactRow.data ? Boolean((await consentStatus(service, contactRow.data.id as string)).rider_news) : false;
  const consent: AlertConsent = {
    alerts: alertsWording ? { id: alertsWording.id, body: alertsWording.body } : null,
    news: newsWording ? { id: newsWording.id, body: newsWording.body } : null,
    newsOn,
  };

  const newDefaults: AlertDefaults = {
    place: fromSearch ? (sp.location ?? "") : "",
    radiusKm: 100,
    who: fromSearch && searchProfession ? `p:${searchProfession.id}` : "",
    termIds: searchTerm ? [searchTerm.id] : [],
    wantsEvents: true,
    wantsNewProviders: fromSearch,
    source: fromSearch ? "search" : "account",
  };

  const favourites: Favourite[] = (favouriteRows ?? [])
    .map((row) => {
      const c = (
        row as unknown as {
          provider_id: string;
          providers: {
            slug: string;
            name: string;
            headline: string;
            suburb: string;
            state: string;
            lat: number | null;
            long: number | null;
            provider_terms: { sort_order: number; terms: { name: string; kind: string } | null }[];
            provider_photos: { storage_path: string; sort_order: number }[];
          } | null;
        }
      ).providers;
      if (!c) return null;
      const km = home && c.lat != null && c.long != null ? Math.round(haversineKm(home.lat, home.long, c.lat, c.long)) : null;
      const photo = [...(c.provider_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
      return {
        coachId: row.provider_id,
        slug: c.slug,
        name: c.name,
        headline: c.headline,
        where: `${c.suburb} ${c.state}${km != null ? ` · ${km} km` : ""}`,
        tags: (c.provider_terms ?? [])
          .filter((t) => t.terms?.kind === "discipline")
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((t) => t.terms!.name)
          .slice(0, 2),
        photoUrl: photo ? supabase.storage.from("provider-photos").getPublicUrl(photo.storage_path).data.publicUrl : null,
      };
    })
    .filter((f): f is Favourite => f !== null);

  const sent: Sent[] = (sentRows ?? []).map((r) => {
    const row = r as unknown as { id: string; want: string; status: Sent["status"]; created_at: string; providers: { name: string } | null };
    const d = new Date(row.created_at);
    return { id: row.id, coachName: row.providers?.name || "Coach", want: WANT[row.want] ?? row.want, when: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`, status: row.status };
  });

  const nearby: Nearby[] = ((nearbyRows ?? []) as { id: string; title: string; start_date: string; location_text: string; provider_name: string }[]).slice(0, 4).map((c) => {
    const d = new Date(c.start_date);
    return { id: c.id, title: c.title, day: d.getDate(), mon: MONTH_SHORT[d.getMonth()], who: c.provider_name, where: c.location_text.split("·")[0].replace(/\s+(VIC|NSW|QLD|SA|WA|TAS|ACT|NT)\b.*$/, "").trim() };
  });

  const h2 = "font-display text-[28px] leading-none text-ink wide:text-[32px]";
  const rowLink = "flex items-center justify-between border-b border-shade py-3 text-[14px] leading-[1.5] text-muted";

  return (
    <div className="fade-in mx-auto max-w-[1184px] px-[18px] pt-6 pb-10 wide:px-12 wide:pt-11 wide:pb-20">
      <p data-eyebrow className="text-[12px] font-medium uppercase tracking-[0.18em] text-subtle">My account</p>
      <div className="wide:flex wide:items-end wide:justify-between wide:gap-6">
        <h1 className="mt-1.5 font-display text-[40px] leading-none -tracking-[0.02em] text-ink wide:mt-2 wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.025em]">Hello, {firstName}</h1>
        <p className="mt-2.5 max-w-[44ch] text-[15px] leading-[1.5] text-muted wide:mt-0 wide:text-right">Free, always. This is where the people you&apos;ve saved and your alerts live.</p>
      </div>

      <div className="mt-[26px] grid grid-cols-1 gap-8 wide:mt-10 wide:grid-cols-[1.6fr_1fr] wide:items-start wide:gap-10">
        {/* left column on desktop; on phones the wrapper is display:contents */}
        <div className="contents wide:flex wide:flex-col">
          <section data-saved className="order-1">
            <div className="flex items-baseline justify-between">
              <h2 className={h2}>Saved</h2>
              <span data-fav-count className="text-[14px] text-subtle">{favourites.length > 0 ? `${favourites.length} saved` : ""}</span>
            </div>
            <div className="mt-3.5 flex flex-col gap-2.5 wide:mt-4">
              {favourites.length === 0 ? (
                <div data-empty className="rounded-[16px] border border-dashed border-[#d9cdb6] px-[18px] py-[26px] text-center wide:p-9">
                  <p className="font-display text-[20px] leading-[1.2] text-ink wide:text-[24px]">Nothing saved yet</p>
                  <p className="mt-2 text-[14px] leading-[1.5] text-muted wide:text-[15px]">Tap the heart on anyone&apos;s profile to keep them here.</p>
                  <Link href="/search" className="mt-3.5 inline-block rounded-[var(--radius-pill)] border border-ink px-4 py-2.5 text-[14px] font-medium text-ink wide:mt-4 wide:px-[18px] wide:py-[11px]">
                    Find someone
                  </Link>
                </div>
              ) : (
                favourites.map((f) => (
                  <div
                    key={f.coachId}
                    data-fav
                    className="grid grid-cols-[72px_1fr_auto] items-center gap-3.5 rounded-[16px] border border-border bg-surface p-3 transition-[border-color] duration-300 hover:border-accent wide:grid-cols-[84px_1fr_auto_auto] wide:gap-[18px] wide:py-3 wide:pr-[18px] wide:pl-3"
                  >
                    <Link href={profilePath(f.slug)} className="block h-[86px] w-[72px] overflow-hidden rounded-t-[36px] rounded-b-[8px] bg-shade wide:h-[100px] wide:w-[84px] wide:rounded-t-[42px]">
                      {f.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.photoUrl} alt="" className="block h-full w-full object-cover" />
                      ) : null}
                    </Link>
                    <div className="min-w-0">
                      <Link href={profilePath(f.slug)} className="font-display text-[21px] leading-[1.05] text-ink wide:text-[24px]">
                        {f.name}
                      </Link>
                      <div className="mt-1 text-[13px] text-subtle wide:text-[14px]">{f.where}</div>
                      <p className="mt-1.5 hidden truncate text-[14px] leading-[1.4] text-muted wide:block">{f.headline}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1 wide:hidden">
                        {f.tags.map((t) => (
                          <span key={t} className="whitespace-nowrap rounded-[var(--radius-pill)] border border-border px-2 py-[3px] text-[11px] font-medium text-muted">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="hidden max-w-[180px] flex-wrap justify-end gap-1 wide:flex">
                      {f.tags.map((t) => (
                        <span key={t} className="whitespace-nowrap rounded-[var(--radius-pill)] border border-border px-[9px] py-1 text-[12px] font-medium text-muted">
                          {t}
                        </span>
                      ))}
                    </div>
                    <form action={removeFavourite.bind(null, f.coachId)}>
                      <button type="submit" title="Remove" aria-label={`Remove ${f.name} from saved`} className="p-1.5 text-[20px] leading-none text-accent wide:text-[22px]">
                        ♥
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </section>

          <section data-sent className="order-4 wide:mt-11">
            <h2 className={h2}>Enquiries you&apos;ve sent</h2>
            <div className="mt-3.5 flex flex-col border-t border-border">
              {sent.length === 0 ? (
                <p className="py-3.5 text-[14px] text-subtle">Nothing sent yet. Every profile has an enquiry form, and what you send shows up here.</p>
              ) : (
                sent.map((s) => (
                  <div key={s.id} data-sent-row className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border py-3.5 wide:grid-cols-[1fr_auto_auto] wide:gap-5 wide:py-4">
                    <div>
                      <div className="text-[15px] font-medium text-fg wide:font-display wide:text-[20px] wide:font-normal wide:leading-none wide:text-ink">{s.coachName}</div>
                      <div className="mt-0.5 text-[13px] text-subtle wide:mt-1 wide:text-[13.5px]">
                        <span className="wide:hidden">{s.when} · </span>
                        {s.want}
                      </div>
                    </div>
                    <span className="hidden text-[13.5px] text-subtle wide:inline">{s.when}</span>
                    <span data-status={s.status} className={`whitespace-nowrap rounded-[var(--radius-pill)] px-[9px] py-[5px] text-[11px] font-medium uppercase tracking-[0.08em] wide:px-2.5 wide:py-1.5 ${STATUS[s.status].cls}`}>
                      {STATUS[s.status].label}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* right column on desktop */}
        <div className="contents wide:flex wide:flex-col wide:gap-4">
          <section id="alerts" data-alerts className="order-2 scroll-mt-24 wide:rounded-[18px] wide:border wide:border-border wide:bg-surface wide:px-6 wide:py-[22px]">
            <h2 className="font-display text-[28px] leading-none text-ink">Alerts</h2>
            <p className="mt-2 text-[14.5px] leading-[1.5] text-muted wide:text-[14px]">
              An email when a clinic comes up or someone new starts near you, for whoever you follow. Nothing else.
            </p>
            {contactRow.data?.token && (
              <p className="mt-1.5 text-[13.5px]">
                <Link href={`/email-preferences?t=${contactRow.data.token}`} className="text-accent underline-offset-2 hover:underline">Choose what we email you</Link>
              </p>
            )}
            {saved === "1" && <p role="status" className="mt-3 text-[13.5px] text-muted">Alert saved.</p>}
            {sp.alert_error && <p role="alert" className="mt-3 text-[13.5px] text-accent">{sp.alert_error}</p>}
            <ul className="mt-4 flex flex-col gap-2.5">
              {alerts.map((a) => {
                const d = describe(a);
                return (
                  <li key={a.id} data-alert className={`rounded-[14px] border border-border bg-surface p-3.5 ${a.unsubscribed_at ? "opacity-70" : ""}`}>
                    <p className="text-[15px] font-medium text-fg">{d.who}</p>
                    <p className="mt-0.5 text-[13.5px] text-subtle">
                      {d.where} · {d.what}
                      {a.unsubscribed_at ? " · off" : ""}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
                      <form action={setAlertActive.bind(null, a.id, Boolean(a.unsubscribed_at))}>
                        <button type="submit" className="font-medium text-accent">
                          {a.unsubscribed_at ? "Turn back on" : "Turn off"}
                        </button>
                      </form>
                      <form action={deleteAlert.bind(null, a.id)}>
                        <button type="submit" className="text-subtle">
                          Delete
                        </button>
                      </form>
                      {!a.provider_id && (
                        <details className="w-full [&[open]>summary]:mb-3">
                          <summary className="cursor-pointer font-medium text-accent">Change</summary>
                          <AlertForm professions={professions} defaults={toDefaults(a)} submitLabel="Save changes" consent={consent} />
                        </details>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <details open={alerts.length === 0 || fromSearch} className="mt-4 rounded-[14px] border border-dashed border-border p-3.5 [&[open]>summary]:mb-3">
              <summary className="cursor-pointer text-[15px] font-medium text-accent">{alerts.length ? "Add another alert" : "Set up an alert"}</summary>
              <AlertForm professions={professions} defaults={newDefaults} submitLabel="Save alert" consent={consent} />
            </details>
          </section>

          <section data-nearby className="order-3 wide:rounded-[18px] wide:bg-ink wide:px-6 wide:py-[22px] wide:text-ink-fg">
            <h2 className="font-display text-[28px] leading-none text-ink wide:hidden">Coming up near you</h2>
            <p className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-peach wide:block">Coming up near you</p>
            <div className="mt-3.5 flex flex-col gap-2.5">
              {nearby.length === 0 ? (
                <p className="text-[14px] leading-[1.5] text-subtle wide:text-ink-fg/70">Nothing listed near you yet. Set up an alert and clinics and events show up here as they&apos;re listed.</p>
              ) : (
                nearby.map((c) => (
                  <Link
                    key={c.id}
                    href={eventPath(c.id)}
                    data-clinic
                    className="grid grid-cols-[56px_1fr] gap-3 rounded-[14px] border border-border bg-surface p-3 text-fg wide:grid-cols-[52px_1fr] wide:rounded-[12px] wide:border-0 wide:bg-ink-card wide:text-ink-fg"
                  >
                    <span className="self-start rounded-[10px] bg-shade py-[7px] text-center wide:rounded-[8px] wide:bg-ink-fg/10 wide:py-1.5">
                      <span className="block font-display text-[24px] leading-none text-ink wide:text-[22px] wide:text-ink-fg">{c.day}</span>
                      {/* canvas: cream at .6 — 3.7:1 at 10px, under AA; .75 measures 5.4:1 */}
                      <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.1em] text-subtle wide:text-ink-fg/75">{c.mon}</span>
                    </span>
                    <span>
                      <span className="block font-display text-[18px] leading-[1.1] text-ink wide:text-ink-fg">{c.title}</span>
                      <span className="mt-1 block text-[13px] text-subtle wide:text-ink-fg/70">
                        {c.who} · {c.where}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>

          <nav data-links aria-label="Account" className="order-5 flex flex-col gap-0.5 wide:mt-4">
            <Link href="/forgot-password" className={rowLink}>
              Email &amp; password<span className="text-subtle">→</span>
            </Link>
            <form action="/auth/sign-out" method="post" className="contents">
              <button type="submit" className={`${rowLink} w-full text-left`}>
                Sign out<span className="text-subtle">→</span>
              </button>
            </form>
            <Link href="/account/delete" className="py-3 text-[14px] leading-[1.5] text-subtle">
              Delete my account
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
