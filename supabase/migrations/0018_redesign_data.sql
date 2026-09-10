-- Golden Hour redesign, Phase R3 (docs/redesign-plan.md §2): the product
-- surfaces the canvases render that the schema didn't yet hold.
--
--   enquiries       the coach's inbox (statuses feed the monthly email) and
--                   the rider's "enquiries you've sent"
--   coach_events    impressions / profile views / phone reveals, for the
--                   dashboard's four numbers and the 12-month trend
--   coach_profiles  taking_students, travel_radius_km, years_coaching
--   coach_terms     a one-line detail per attribute ("60 × 20 m, all-weather")
--   clinics         capacity + places_left
--   clinics_for_rider()  the rider account's "Coming up near you"

-- ── enquiries ────────────────────────────────────────────────────────────
create type public.enquiry_want as enum ('regular', 'one_off', 'clinic');
create type public.enquiry_status as enum ('new', 'replied', 'booked', 'no_response');

create table public.enquiries (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references public.coach_profiles (id) on delete cascade,
  rider_id      uuid references public.profiles (id) on delete set null,
  rider_name    text not null,
  rider_contact text not null,          -- email or mobile, as the rider typed it
  want          public.enquiry_want not null default 'regular',
  message       text not null,
  status        public.enquiry_status not null default 'new',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index enquiries_coach_idx on public.enquiries (coach_id, created_at desc);
create index enquiries_rider_idx on public.enquiries (rider_id, created_at desc) where rider_id is not null;

alter table public.enquiries enable row level security;

-- Coaches read and update (status) their own inbox; riders read what they
-- sent. No insert policy for any role: rows are written from the enquiry
-- server action with the service-role client, after it has re-read the
-- coach's form toggle from the DB — an open insert policy would be a spam
-- endpoint, the same reasoning as search_events.
create policy "coaches read their enquiries"
  on public.enquiries for select
  using (auth.uid() = coach_id or auth.uid() = rider_id);

create policy "coaches update their enquiries"
  on public.enquiries for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- ── coach_events ─────────────────────────────────────────────────────────
create type public.coach_event_kind as enum ('impression', 'view', 'reveal');

create table public.coach_events (
  id           bigserial primary key,
  coach_id     uuid not null references public.coach_profiles (id) on delete cascade,
  kind         public.coach_event_kind not null,
  visitor_hash text,                     -- daily-salted hash of ip+ua, for dedupe
  created_at   timestamptz not null default now(),
  -- UTC calendar day, stored so it can sit in a unique index (a bare
  -- created_at::date is timezone-dependent and so not immutable).
  event_day    date generated always as ((created_at at time zone 'UTC')::date) stored
);

create index coach_events_coach_idx on public.coach_events (coach_id, kind, created_at desc);
-- One row per visitor per coach per kind per day: the logger upserts with
-- ON CONFLICT on these four columns and ignores duplicates. Not a partial
-- index — PostgREST can't name a partial index's predicate as a conflict
-- target — and a null visitor_hash is distinct from every other null, so
-- rows logged outside a request (no hash) are simply never deduped.
create unique index coach_events_dedupe
  on public.coach_events (coach_id, kind, visitor_hash, event_day);

alter table public.coach_events enable row level security;

create policy "coaches read their own events"
  on public.coach_events for select
  using (auth.uid() = coach_id);
-- No insert policy: written with the service-role client only.

-- ── coach_profiles ───────────────────────────────────────────────────────
create type public.taking_students as enum ('yes', 'waitlist', 'no');

alter table public.coach_profiles
  add column taking_students  public.taking_students not null default 'yes',
  add column travel_radius_km int check (travel_radius_km is null or (travel_radius_km >= 0 and travel_radius_km <= 1000)),
  add column years_coaching   int check (years_coaching is null or (years_coaching >= 0 and years_coaching <= 80));

-- ── coach_terms.detail ───────────────────────────────────────────────────
alter table public.coach_terms
  add column detail text check (detail is null or char_length(detail) <= 120);

-- ── clinics ──────────────────────────────────────────────────────────────
alter table public.clinics
  add column capacity    int check (capacity is null or capacity >= 0),
  add column places_left int check (places_left is null or places_left >= 0);

-- ── clinics_for_rider ────────────────────────────────────────────────────
-- The inverse of matching_riders_for_clinic (0006): upcoming clinics whose
-- discipline the rider follows, or whose coach is within 100 km of the
-- rider's saved area. Invoker rights — a rider can only read their own
-- rider_preferences row and clinics are public, so no elevation needed.
create or replace function public.clinics_for_rider(p_rider_id uuid)
returns table (
  id uuid,
  coach_id uuid,
  title text,
  start_date date,
  end_date date,
  location_text text,
  coach_name text,
  coach_slug text
)
language sql
stable
as $$
  select c.id, c.coach_id, c.title, c.start_date, c.end_date, c.location_text,
         p.name as coach_name, cp.slug as coach_slug
  from public.rider_preferences rp
  join public.clinics c on true
  join public.coach_profiles cp on cp.id = c.coach_id and cp.published = true
  join public.profiles p on p.id = cp.id
  where rp.rider_id = p_rider_id
    and c.start_date >= current_date
    and (
      (c.discipline_id is not null and c.discipline_id = any(rp.followed_discipline_ids))
      or (
        rp.location is not null and cp.location is not null
        and st_dwithin(rp.location, cp.location, 100000)
      )
    )
  order by c.start_date
  limit 10;
$$;
