-- Equestrian Coaches Australia — initial schema
-- Phase 2 of the build plan: profiles, disciplines, coach profiles,
-- clinics, favourites/preferences, plus RLS.

create extension if not exists postgis;

-- ── profiles ─────────────────────────────────────────────────────────────
-- 1:1 with auth.users. role chosen at signup, immutable after (a user who
-- wants both roles creates a second account — out of scope for v1).
create type public.user_role as enum ('rider', 'coach');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profiles row when someone signs up. role/name come from
-- the signUp() call's options.data (see src/lib/supabase/auth.ts).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'rider'),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── disciplines ──────────────────────────────────────────────────────────
create table public.disciplines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  blurb text not null default '',
  sort_order int not null default 0
);

alter table public.disciplines enable row level security;

create policy "disciplines are viewable by everyone"
  on public.disciplines for select
  using (true);

-- ── coach_profiles ───────────────────────────────────────────────────────
create type public.subscription_tier as enum ('standard', 'standard_plus_clinics');
create type public.subscription_status as enum ('inactive', 'active', 'past_due', 'canceled');

create table public.coach_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique,
  headline text not null default '',
  bio text not null default '',
  suburb text not null default '',
  state text not null default '',
  postcode text not null default '',
  location geography(point, 4326),
  travels_to_rider boolean not null default false,
  qualifications text[] not null default '{}',
  subscription_tier public.subscription_tier,
  subscription_status public.subscription_status not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coach_profiles_location_idx on public.coach_profiles using gist (location);

alter table public.coach_profiles enable row level security;

create policy "published coach profiles are viewable by everyone"
  on public.coach_profiles for select
  using (published = true or auth.uid() = id);

create policy "coaches manage their own profile"
  on public.coach_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── coach_disciplines (join) ─────────────────────────────────────────────
create table public.coach_disciplines (
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  discipline_id uuid not null references public.disciplines (id) on delete cascade,
  primary key (coach_id, discipline_id)
);

alter table public.coach_disciplines enable row level security;

create policy "coach_disciplines viewable by everyone"
  on public.coach_disciplines for select
  using (true);

create policy "coaches manage their own discipline tags"
  on public.coach_disciplines for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- ── coach_photos ─────────────────────────────────────────────────────────
create table public.coach_photos (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.coach_photos enable row level security;

create policy "coach_photos viewable by everyone"
  on public.coach_photos for select
  using (true);

create policy "coaches manage their own photos"
  on public.coach_photos for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- ── testimonials ─────────────────────────────────────────────────────────
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  author_name text not null,
  quote text not null,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

create policy "testimonials viewable by everyone"
  on public.testimonials for select
  using (true);

create policy "coaches manage their own testimonials"
  on public.testimonials for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- ── clinics ──────────────────────────────────────────────────────────────
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  discipline_id uuid references public.disciplines (id),
  location_text text not null default '',
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now()
);

alter table public.clinics enable row level security;

create policy "clinics viewable by everyone"
  on public.clinics for select
  using (true);

-- Only coaches on the clinics tier may create/update/delete — enforced in
-- the DB, not just hidden in the UI.
create policy "clinics tier coaches manage their own clinics"
  on public.clinics for all
  using (
    auth.uid() = coach_id
    and exists (
      select 1 from public.coach_profiles cp
      where cp.id = auth.uid()
        and cp.subscription_tier = 'standard_plus_clinics'
        and cp.subscription_status = 'active'
    )
  )
  with check (
    auth.uid() = coach_id
    and exists (
      select 1 from public.coach_profiles cp
      where cp.id = auth.uid()
        and cp.subscription_tier = 'standard_plus_clinics'
        and cp.subscription_status = 'active'
    )
  );

-- ── favourites ───────────────────────────────────────────────────────────
create table public.favourites (
  rider_id uuid not null references public.profiles (id) on delete cascade,
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (rider_id, coach_id)
);

alter table public.favourites enable row level security;

create policy "riders manage their own favourites"
  on public.favourites for all
  using (auth.uid() = rider_id)
  with check (auth.uid() = rider_id);

-- ── rider_preferences ────────────────────────────────────────────────────
create table public.rider_preferences (
  rider_id uuid primary key references public.profiles (id) on delete cascade,
  suburb text,
  postcode text,
  location geography(point, 4326),
  followed_discipline_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.rider_preferences enable row level security;

create policy "riders manage their own preferences"
  on public.rider_preferences for all
  using (auth.uid() = rider_id)
  with check (auth.uid() = rider_id);

-- ── notifications_log ────────────────────────────────────────────────────
-- Written by the server-side cron matcher (service-role key) — no client
-- access needed, RLS stays default-deny.
create table public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (rider_id, clinic_id)
);

alter table public.notifications_log enable row level security;

-- ── postcodes ────────────────────────────────────────────────────────────
-- Static AU postcode -> suburb/state/lat-long lookup, loaded once from a
-- data.gov.au dataset (see supabase/seed.sql placeholder + build plan
-- phase 4). Read-only from the client.
create table public.postcodes (
  postcode text not null,
  suburb text not null,
  state text not null,
  location geography(point, 4326) not null,
  primary key (postcode, suburb)
);

create index postcodes_location_idx on public.postcodes using gist (location);

alter table public.postcodes enable row level security;

create policy "postcodes are viewable by everyone"
  on public.postcodes for select
  using (true);
