import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import { JsonLd } from "@/components/json-ld";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbSchema, clinicEventSchema } from "@/lib/structured-data";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function getClinic(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("clinics")
    .select(
      "title, description, location_text, start_date, end_date, capacity, places_left, terms(slug, name), coach_profiles(id, slug, suburb, state, headline, show_contact_form, taking_students, published, profiles!coach_profiles_id_fkey(name), coach_photos(storage_path, sort_order))"
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clinic = await getClinic(id);
  if (!clinic) return { title: "Clinic not found" };
  return { title: clinic.title, description: `${clinic.title} — ${clinic.location_text}.` };
}

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/**
 * Public clinic page (no canvas — built from the dashboard's clinic card and
 * the coach profile's enquiry aside). Light header, date block + title,
 * details card, the hosting coach's card, and "Ask about this clinic" — the
 * profile's ContactForm with `want` pre-set to clinic, shown only when the
 * coach takes enquiries.
 */
export default async function ClinicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clinic = await getClinic(id);
  if (!clinic) notFound();
  const supabase = await createClient();

  const discipline = (clinic as unknown as { terms: { slug: string; name: string } | null }).terms;
  const coach = (
    clinic as unknown as {
      coach_profiles: {
        id: string;
        slug: string;
        suburb: string;
        state: string;
        headline: string;
        show_contact_form: boolean;
        taking_students: string | null;
        published: boolean;
        profiles: { name: string } | null;
        coach_photos: { storage_path: string; sort_order: number }[];
      } | null;
    }
  ).coach_profiles;
  const coachName = coach?.profiles?.name ?? "Coach";
  const photo = coach ? [...(coach.coach_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0] : null;
  const photoUrl = photo && supabase ? supabase.storage.from("coach-photos").getPublicUrl(photo.storage_path).data.publicUrl : null;
  const canAsk = Boolean(coach && coach.published && coach.show_contact_form && coach.taking_students !== "no");
  const start = new Date(clinic.start_date);
  const when = clinic.end_date && clinic.end_date !== clinic.start_date ? `${longDate(clinic.start_date)} – ${longDate(clinic.end_date)}` : longDate(clinic.start_date);
  const places = clinic.places_left ?? clinic.capacity ?? null;

  return (
    <div className="fade-in mx-auto max-w-[1184px] px-[18px] pt-6 pb-14 wide:px-12 wide:pt-11 wide:pb-20">
      <JsonLd
        data={[
          clinicEventSchema({
            id,
            title: clinic.title,
            description: clinic.description,
            locationText: clinic.location_text,
            startDate: clinic.start_date,
            endDate: clinic.end_date,
            coach: coach ? { name: coachName, slug: coach.slug } : null,
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            ...(coach ? [{ name: coachName, url: `/coaches/${coach.slug}` }] : []),
            { name: clinic.title, url: `/clinics/${id}` },
          ]),
        ]}
      />
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-subtle">
        Clinic{discipline ? ` · ${discipline.name}` : ""}
      </p>
      <div className="mt-3 grid grid-cols-[64px_1fr] items-start gap-4 wide:mt-4 wide:grid-cols-[84px_1fr] wide:gap-6">
        <span data-date className="rounded-[12px] bg-shade py-2.5 text-center wide:rounded-[14px] wide:py-3.5">
          <span className="block font-display text-[30px] leading-none text-ink wide:text-[40px]">{start.getDate()}</span>
          <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.1em] text-subtle wide:text-[12px]">{MONTH_SHORT[start.getMonth()]}</span>
        </span>
        <div>
          <h1 className="font-display text-[34px] leading-[1.02] -tracking-[0.01em] text-ink wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.02em]">{clinic.title}</h1>
          <p className="mt-2.5 text-[15px] leading-[1.5] text-muted wide:text-[16px]">
            {when} · {clinic.location_text}
          </p>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 wide:mt-10 wide:grid-cols-[1.6fr_1fr] wide:items-start wide:gap-10">
        <div className="flex flex-col gap-6">
          {clinic.description && (
            <section data-about className="rounded-[16px] border border-border bg-surface p-[18px] wide:rounded-[18px] wide:px-6 wide:py-[22px]">
              <h2 className="font-display text-[24px] leading-none text-ink wide:text-[28px]">About this clinic</h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.6] text-fg wide:text-[16px]">{clinic.description}</p>
            </section>
          )}
          <dl data-details className="grid grid-cols-2 gap-2.5 wide:grid-cols-3 wide:gap-3">
            <div className="rounded-[14px] border border-border bg-surface px-3.5 py-3.5">
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Where</dt>
              <dd className="mt-1.5 text-[15px] leading-[1.35] text-ink">{clinic.location_text}</dd>
            </div>
            <div className="rounded-[14px] border border-border bg-surface px-3.5 py-3.5">
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Places</dt>
              <dd className="mt-1.5 text-[15px] leading-[1.35] text-ink">{places != null ? `${places} left` : "Ask the coach"}</dd>
            </div>
            {discipline && (
              <div className="rounded-[14px] border border-border bg-surface px-3.5 py-3.5">
                <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Discipline</dt>
                <dd className="mt-1.5 text-[15px] leading-[1.35] text-ink">
                  <Link href={`/disciplines/${discipline.slug}`} className="text-accent">
                    {discipline.name}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
          {coach && (
            <section data-organiser className="grid grid-cols-[72px_1fr] items-center gap-3.5 rounded-[16px] border border-border bg-surface p-3 wide:grid-cols-[84px_1fr] wide:gap-[18px] wide:py-3 wide:pr-[18px] wide:pl-3">
              <Link href={`/coaches/${coach.slug}`} className="block h-[86px] w-[72px] overflow-hidden rounded-t-[36px] rounded-b-[8px] bg-shade wide:h-[100px] wide:w-[84px] wide:rounded-t-[42px]">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="block h-full w-full object-cover" />
                ) : null}
              </Link>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Hosted by</p>
                <Link href={`/coaches/${coach.slug}`} className="mt-1 block font-display text-[22px] leading-[1.05] text-ink wide:text-[26px]">
                  {coachName}
                </Link>
                <p className="mt-1 text-[13px] text-subtle wide:text-[14px]">
                  {coach.suburb} {coach.state}
                </p>
                <p className="mt-1.5 hidden truncate text-[14px] text-muted wide:block">{coach.headline}</p>
              </div>
            </section>
          )}
        </div>

        <aside data-ask className="rounded-[18px] border border-border bg-surface p-[18px] wide:sticky wide:top-[calc(var(--header-h)+24px)] wide:px-6 wide:py-[22px]">
          <h2 className="font-display text-[24px] leading-none text-ink wide:text-[28px]">Ask about this clinic</h2>
          {canAsk && coach ? (
            <>
              <p className="mt-2 text-[14px] leading-[1.5] text-muted">Goes straight to {coachName.split(" ")[0]}. Free, no account needed.</p>
              <div className="mt-4">
                <ContactForm coachId={coach.id} firstName={coachName.split(" ")[0]} defaultWant="clinic" />
              </div>
            </>
          ) : (
            <p className="mt-2 text-[14px] leading-[1.5] text-muted">
              {coach ? `${coachName.split(" ")[0]} isn't taking enquiries through ECA right now — their profile has the other ways to reach them.` : "This coach's profile is no longer listed."}
              {coach && (
                <>
                  {" "}
                  <Link href={`/coaches/${coach.slug}`} className="font-medium text-accent">
                    View profile →
                  </Link>
                </>
              )}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
