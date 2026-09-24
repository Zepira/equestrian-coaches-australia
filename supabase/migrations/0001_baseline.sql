-- ============================================================================
-- Equine Professionals Australia: baseline schema (CMS rebuild, 24 Sep 2026)
--
-- Replaces migrations 0001-0023 (kept in archive-pre-cms/ for history). Built
-- for providers of every profession, per "The Site as a CMS"
-- (content/handbook/cms-model.html §03-§04):
--   * professions are terms (kind 'profession'), their words in
--     profession_details; specialities are kind 'discipline' under a
--     profession via parent_id
--   * a profile is not an account: providers has its own id, users edit it
--     through provider_members, billing lives in subscriptions
--   * page copy in content_blocks; settings and content both keep history
--   * no URLs stored: indexable_pages holds profession/term/area ids and the
--     app builds the path, so the route move is a code change
--
-- Runs against an empty `public` schema (scripts/db/rebuild.mjs wipes and
-- recreates it). Every enum value is part of its `create type`, so nothing has
-- to be added outside a transaction.
-- ============================================================================

create extension if not exists postgis;

-- Supabase's default grants for a recreated public schema. RLS does the real
-- work; these only let the API roles reach the objects at all.
grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- ── Types ───────────────────────────────────────────────────────────────────

create type public.user_role as enum ('rider', 'provider');
create type public.term_kind as enum ('discipline', 'skill', 'attribute', 'profession');
create type public.door as enum ('coaches', 'horse_care');
create type public.launch_state as enum ('draft', 'taking_signups', 'live');
create type public.provider_status as enum ('draft', 'in_review', 'published', 'hidden', 'changes_requested');
create type public.member_role as enum ('owner', 'editor');
create type public.availability as enum ('yes', 'waitlist', 'no');
create type public.subscription_tier as enum ('listed', 'spotlight', 'clinic');
create type public.subscription_status as enum ('inactive', 'card_saved', 'trialing', 'active', 'past_due', 'canceled');
create type public.enquiry_status as enum ('new', 'replied', 'booked', 'no_response');
create type public.provider_event_kind as enum ('impression', 'view', 'reveal', 'enquiry');
create type public.area_kind as enum ('suburb', 'town', 'region', 'state');
create type public.indexable_page_type as enum ('profession_area', 'profession_term_area');

-- ── Accounts ────────────────────────────────────────────────────────────────

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.user_role not null,
  name       text not null,
  email      text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select using (true);
create policy "users update their own profile" on public.profiles for update using (auth.uid() = id);

-- Admin is its own table, not a role: an admin can also be a provider.
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()); $$;
alter table public.admin_users enable row level security;
create policy "admin_users admin only" on public.admin_users for all using (public.is_admin()) with check (public.is_admin());

-- ── Places ──────────────────────────────────────────────────────────────────

create table public.areas (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  kind              public.area_kind not null,
  state             text not null,
  parent_id         uuid references public.areas (id),
  centroid          geography(point, 4326) not null,
  lat               double precision,
  long              double precision,
  default_radius_km int not null default 50,
  intro             text not null default '',
  active            boolean not null default true
);
alter table public.areas enable row level security;
create policy "areas readable" on public.areas for select using (active or public.is_admin());
create policy "areas admin write" on public.areas for all using (public.is_admin()) with check (public.is_admin());

create table public.postcodes (
  postcode text not null,
  suburb   text not null,
  state    text not null,
  location geography(point, 4326) not null,
  lat      double precision not null,
  long     double precision not null,
  area_id  uuid references public.areas (id),
  primary key (postcode, suburb)
);
create index postcodes_location_idx on public.postcodes using gist (location);
alter table public.postcodes enable row level security;
create policy "postcodes readable" on public.postcodes for select using (true);

-- ── Taxonomy ────────────────────────────────────────────────────────────────

create table public.terms (
  id              uuid primary key default gen_random_uuid(),
  kind            public.term_kind not null,
  -- A discipline/speciality's profession; a skill or attribute's profession
  -- when it belongs to one (null = shared by every profession).
  parent_id       uuid references public.terms (id) on delete cascade,
  slug            text not null,
  name            text not null,
  blurb           text not null default '',
  description     text not null default '',
  image_path      text,
  image_alt       text not null default '',
  image_credit    text not null default '',
  seo_title       text not null default '',
  seo_description text not null default '',
  generates_pages boolean not null default false,
  active          boolean not null default true,
  featured        boolean not null default false,
  featured_order  int not null default 0,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Professions sit at the top level of the URL, so none may take a word the
  -- site already uses for a route (§05.4). Mirrors RESERVED_SLUGS in code.
  constraint terms_profession_slug_not_reserved check (
    kind <> 'profession' or slug not in (
      'about', 'account', 'admin', 'api', 'auth', 'clinics', 'dashboard', 'disciplines', 'events',
      'for-coaches', 'for-professionals', 'forgot-password', 'horse-care', 'icon.png', 'apple-icon.png', 'join',
      'list-your-business', 'login', 'profile', 'reset-password', 'riding-instructors', 'robots.txt', 'search',
      'signup', 'sitemap.xml', 'brand', 'hero', 'vendor', '_next'
    )
  ),
  constraint terms_profession_has_no_parent check (kind <> 'profession' or parent_id is null)
);
-- Slugs are unique within their kind and parent: two professions can each
-- have a "rehabilitation" speciality, since their URLs never meet.
create unique index terms_kind_parent_slug_uniq
  on public.terms (kind, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
create index terms_parent_idx on public.terms (parent_id);

create table public.profession_details (
  term_id          uuid primary key references public.terms (id) on delete cascade,
  door             public.door not null,
  glyph_key        text not null,
  launch_state     public.launch_state not null default 'draft',
  -- Nouns
  singular         text not null,             -- "farrier"
  plural           text not null,             -- "farriers" (lower case; terms.name is the display plural)
  short_name       text,                      -- "Physios", for tight spots
  term_noun        text not null default 'speciality',
  term_noun_plural text not null default 'specialities',
  audience_noun    text not null default 'horse owner',
  years_label      text not null default 'years',
  job_title        text not null,             -- structured data jobTitle
  -- Page words
  hero_headline    text not null default '',
  hero_lead        text not null default '',
  hero_lead_short  text not null default '',
  pitch            text not null default '',
  steps            jsonb not null default '[]'::jsonb,
  faq              jsonb not null default '[]'::jsonb,
  -- Behaviour
  enquiry_options  jsonb not null default '[]'::jsonb,
  tier_labels      jsonb not null default '{}'::jsonb,
  completeness     jsonb not null default '[]'::jsonb,
  events_enabled   boolean not null default true,
  remote_allowed   boolean not null default false,
  updated_at       timestamptz not null default now()
);

create table public.term_aliases (
  id         uuid primary key default gen_random_uuid(),
  term_id    uuid not null references public.terms (id) on delete cascade,
  alias      text not null,
  is_primary boolean not null default false,
  source     text not null default 'seed',
  created_at timestamptz not null default now()
);
create unique index term_aliases_lower_uniq on public.term_aliases (lower(alias));

create table public.term_suggestions (
  for_term_id uuid not null references public.terms (id) on delete cascade,
  term_id     uuid not null references public.terms (id) on delete cascade,
  sort_order  int not null default 0,
  primary key (for_term_id, term_id)
);

create table public.term_slug_history (
  kind       public.term_kind not null,
  parent_id  uuid,
  old_slug   text not null,
  term_id    uuid not null references public.terms (id) on delete cascade,
  changed_at timestamptz not null default now()
);
create unique index term_slug_history_uniq
  on public.term_slug_history (kind, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), old_slug);

alter table public.terms enable row level security;
create policy "terms readable" on public.terms for select using (active or public.is_admin());
create policy "terms admin write" on public.terms for all using (public.is_admin()) with check (public.is_admin());
alter table public.profession_details enable row level security;
create policy "profession_details readable" on public.profession_details for select using (true);
create policy "profession_details admin write" on public.profession_details for all using (public.is_admin()) with check (public.is_admin());
alter table public.term_aliases enable row level security;
create policy "term_aliases readable" on public.term_aliases for select using (true);
create policy "term_aliases admin write" on public.term_aliases for all using (public.is_admin()) with check (public.is_admin());
alter table public.term_suggestions enable row level security;
create policy "term_suggestions readable" on public.term_suggestions for select using (true);
create policy "term_suggestions admin write" on public.term_suggestions for all using (public.is_admin()) with check (public.is_admin());
alter table public.term_slug_history enable row level security;
create policy "term_slug_history readable" on public.term_slug_history for select using (true);
create policy "term_slug_history admin write" on public.term_slug_history for all using (public.is_admin()) with check (public.is_admin());

-- ── Providers ───────────────────────────────────────────────────────────────

create table public.invites (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  email         text not null,
  name          text not null default '',
  profession_id uuid references public.terms (id) on delete set null,
  prefill       jsonb not null default '{}'::jsonb,
  cohort        text,
  source        text not null default 'invite',
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '30 days',
  used_at       timestamptz,
  provider_id   uuid
);

create table public.providers (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  business_name      text,
  headline           text not null default '',
  bio                text not null default '',
  suburb             text not null default '',
  state              text not null default '',
  postcode           text not null default '',
  location           geography(point, 4326),
  lat                double precision,
  long               double precision,
  area_id            uuid references public.areas (id),
  travel_radius_km   int check (travel_radius_km is null or travel_radius_km between 0 and 1000),
  travels_to_client  boolean not null default false,
  remote             boolean not null default false,
  availability       public.availability not null default 'yes',
  years_experience   int check (years_experience is null or years_experience between 0 and 80),
  qualifications     text[] not null default '{}',
  -- Contact channels: the value, and whether it shows on the profile.
  contact_email      text not null default '',
  contact_phone      text not null default '',
  facebook_url       text not null default '',
  website_url        text not null default '',
  show_contact_email boolean not null default false,
  show_contact_phone boolean not null default false,
  show_facebook      boolean not null default false,
  show_website       boolean not null default false,
  show_contact_form  boolean not null default true,
  video_url          text,
  video_storage_path text,
  -- Review and lifecycle (§04 F). Every public read tests status = 'published'.
  status             public.provider_status not null default 'draft',
  submitted_at       timestamptz,
  reviewed_by        uuid references public.profiles (id) on delete set null,
  reviewed_at        timestamptz,
  review_note        text,
  published_at       timestamptz,
  -- Measurement (Trello: "impossible to add later")
  cohort             text not null default 'open' check (cohort in ('founding', 'open')),
  acquisition_source text,
  invite_id          uuid references public.invites (id) on delete set null,
  -- Practices later (§04 E): unused at launch.
  organisation_id    uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index providers_location_idx on public.providers using gist (location);
create index providers_status_idx on public.providers (status);
alter table public.invites add constraint invites_provider_fk foreign key (provider_id) references public.providers (id) on delete set null;

create table public.provider_members (
  provider_id uuid not null references public.providers (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.member_role not null default 'owner',
  created_at  timestamptz not null default now(),
  primary key (provider_id, user_id)
);
create index provider_members_user_idx on public.provider_members (user_id);

-- The one question every provider policy asks. security definer so the
-- membership table's own RLS can't recurse into it.
create function public.is_provider_member(p_provider_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.provider_members where provider_id = p_provider_id and user_id = auth.uid()); $$;

create table public.provider_terms (
  provider_id uuid not null references public.providers (id) on delete cascade,
  term_id     uuid not null references public.terms (id) on delete cascade,
  sort_order  int not null default 0,
  detail      text check (detail is null or char_length(detail) <= 120),
  primary key (provider_id, term_id)
);
create index provider_terms_term_idx on public.provider_terms (term_id);

create table public.provider_photos (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.providers (id) on delete cascade,
  storage_path text not null,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create table public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  author_name text not null,
  quote       text not null,
  created_at  timestamptz not null default now()
);

-- One subscription covers every profession a provider has (§09). The billing
-- owner is a provider today and can be an organisation later.
create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  provider_id            uuid unique references public.providers (id) on delete cascade,
  organisation_id        uuid,
  tier                   public.subscription_tier,
  status                 public.subscription_status not null default 'inactive',
  founding               boolean not null default false,
  stripe_customer_id     text,
  stripe_subscription_id text,
  stripe_price_id        text,
  trial_ends_at          timestamptz,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint subscriptions_one_owner check ((provider_id is null) <> (organisation_id is null))
);

create function public.provider_is_subscribed(p_provider_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.provider_id = p_provider_id and s.status in ('card_saved', 'trialing', 'active') and s.tier is not null
  );
$$;

alter table public.invites enable row level security;
create policy "invites admin only" on public.invites for all using (public.is_admin()) with check (public.is_admin());

alter table public.providers enable row level security;
create policy "providers readable when published or by members" on public.providers
  for select using (status = 'published' or public.is_provider_member(id) or public.is_admin());
create policy "members update their provider" on public.providers
  for update using (public.is_provider_member(id)) with check (public.is_provider_member(id));
create policy "admins manage providers" on public.providers
  for all using (public.is_admin()) with check (public.is_admin());
-- Inserts come from the signup trigger or the service role; status changes
-- to published go through review (service role), guarded in the app too.

alter table public.provider_members enable row level security;
create policy "members see their memberships" on public.provider_members
  for select using (user_id = auth.uid() or public.is_admin());
create policy "admins manage memberships" on public.provider_members
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.provider_terms enable row level security;
create policy "provider_terms readable" on public.provider_terms for select using (true);
create policy "members manage provider_terms" on public.provider_terms
  for all using (public.is_provider_member(provider_id)) with check (public.is_provider_member(provider_id));

alter table public.provider_photos enable row level security;
create policy "provider_photos readable" on public.provider_photos for select using (true);
create policy "members manage provider_photos" on public.provider_photos
  for all using (public.is_provider_member(provider_id)) with check (public.is_provider_member(provider_id));

alter table public.testimonials enable row level security;
create policy "testimonials readable" on public.testimonials for select using (true);
create policy "members manage testimonials" on public.testimonials
  for all using (public.is_provider_member(provider_id)) with check (public.is_provider_member(provider_id));

-- Billing is written only by the Stripe webhook and billing actions, with the
-- service role. Members may read their own.
alter table public.subscriptions enable row level security;
create policy "members read their subscription" on public.subscriptions
  for select using (public.is_provider_member(provider_id) or public.is_admin());

-- ── Activity ────────────────────────────────────────────────────────────────

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references public.providers (id) on delete cascade,
  profession_id uuid references public.terms (id) on delete set null,
  term_id       uuid references public.terms (id) on delete set null,
  title         text not null,
  description   text not null default '',
  location_text text not null default '',
  location      geography(point, 4326),
  start_date    date not null,
  end_date      date,
  capacity      int check (capacity is null or capacity >= 0),
  places_left   int check (places_left is null or places_left >= 0),
  created_at    timestamptz not null default now()
);
create index events_start_idx on public.events (start_date);
alter table public.events enable row level security;
create policy "events readable" on public.events for select using (true);
create policy "subscribed members manage events" on public.events
  for all using (public.is_provider_member(provider_id) and public.provider_is_subscribed(provider_id))
  with check (public.is_provider_member(provider_id) and public.provider_is_subscribed(provider_id));

create table public.enquiries (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references public.providers (id) on delete cascade,
  profession_id uuid references public.terms (id) on delete set null,
  rider_id      uuid references public.profiles (id) on delete set null,
  rider_name    text not null,
  rider_contact text not null,
  -- One of the profession's enquiry_options values; text so each profession
  -- can offer its own ("regular", "one_off", "clinic" for coaches).
  want          text not null default 'regular',
  message       text not null,
  status        public.enquiry_status not null default 'new',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index enquiries_provider_idx on public.enquiries (provider_id, created_at desc);
create index enquiries_rider_idx on public.enquiries (rider_id, created_at desc) where rider_id is not null;
alter table public.enquiries enable row level security;
create policy "members and riders read enquiries" on public.enquiries
  for select using (public.is_provider_member(provider_id) or auth.uid() = rider_id);
create policy "members update enquiries" on public.enquiries
  for update using (public.is_provider_member(provider_id)) with check (public.is_provider_member(provider_id));

create table public.favourites (
  rider_id    uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.providers (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (rider_id, provider_id)
);
alter table public.favourites enable row level security;
create policy "riders manage their favourites" on public.favourites
  for all using (auth.uid() = rider_id) with check (auth.uid() = rider_id);

-- Several alerts per rider, any profession (§07).
create table public.rider_alerts (
  id                  uuid primary key default gen_random_uuid(),
  rider_id            uuid not null references public.profiles (id) on delete cascade,
  label               text,
  suburb              text,
  postcode            text,
  location            geography(point, 4326),
  radius_km           int not null default 100 check (radius_km between 1 and 1000),
  door                public.door,
  profession_ids      uuid[] not null default '{}',
  term_ids            uuid[] not null default '{}',
  wants_events        boolean not null default true,
  wants_new_providers boolean not null default false,
  consent_source      text not null default 'account',
  consented_at        timestamptz not null default now(),
  unsubscribed_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index rider_alerts_rider_idx on public.rider_alerts (rider_id);
alter table public.rider_alerts enable row level security;
create policy "riders manage their alerts" on public.rider_alerts
  for all using (auth.uid() = rider_id) with check (auth.uid() = rider_id);

create table public.notifications_log (
  id          uuid primary key default gen_random_uuid(),
  rider_id    uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,                -- 'event' | 'new_provider' | 'monthly'
  event_id    uuid references public.events (id) on delete cascade,
  provider_id uuid references public.providers (id) on delete cascade,
  alert_id    uuid references public.rider_alerts (id) on delete set null,
  sent_at     timestamptz not null default now()
);
create unique index notifications_log_event_uniq on public.notifications_log (rider_id, event_id) where event_id is not null;
create unique index notifications_log_provider_uniq on public.notifications_log (rider_id, provider_id) where kind = 'new_provider';
alter table public.notifications_log enable row level security;

-- ── Measurement ─────────────────────────────────────────────────────────────

create table public.provider_events (
  id            bigserial primary key,
  provider_id   uuid not null references public.providers (id) on delete cascade,
  profession_id uuid references public.terms (id) on delete set null,
  kind          public.provider_event_kind not null,
  visitor_hash  text,
  created_at    timestamptz not null default now(),
  event_day     date generated always as ((created_at at time zone 'UTC')::date) stored
);
create index provider_events_idx on public.provider_events (provider_id, kind, created_at desc);
-- Plain columns, so the app's upsert can name it as its conflict target
-- (an expression index can't be). One row per visitor per provider per kind
-- per day; profession_id records which section it came from.
create unique index provider_events_dedupe
  on public.provider_events (provider_id, kind, visitor_hash, event_day);
alter table public.provider_events enable row level security;
create policy "members read their provider_events" on public.provider_events
  for select using (public.is_provider_member(provider_id));

create table public.search_events (
  id                  bigserial primary key,
  q                   text,
  profession_id       uuid references public.terms (id) on delete set null,
  term_ids            uuid[] not null default '{}',
  location_text       text,
  lat                 double precision,
  lng                 double precision,
  radius_km           int,
  result_count        int not null,
  clicked_provider_id uuid references public.providers (id) on delete set null,
  created_at          timestamptz not null default now()
);
create index search_events_zero on public.search_events (created_at desc) where result_count = 0;
alter table public.search_events enable row level security;
create policy "search_events admin read" on public.search_events for select using (public.is_admin());

create table public.provider_month_stats (
  provider_id       uuid not null references public.providers (id) on delete cascade,
  profession_id     uuid references public.terms (id) on delete set null,
  month             date not null,
  impressions       int not null default 0,
  views             int not null default 0,
  reveals           int not null default 0,
  enquiries         int not null default 0,
  bookings_reported int not null default 0,
  gsc_impressions   int not null default 0,
  frozen_at         timestamptz
);
create unique index provider_month_stats_uniq
  on public.provider_month_stats (provider_id, coalesce(profession_id, '00000000-0000-0000-0000-000000000000'::uuid), month);
alter table public.provider_month_stats enable row level security;
create policy "members read their month stats" on public.provider_month_stats
  for select using (public.is_provider_member(provider_id) or public.is_admin());

create table public.gsc_daily (
  date        date not null,
  page        text not null,
  query       text not null,
  device      text not null,
  impressions int not null default 0,
  clicks      int not null default 0,
  position    double precision,
  primary key (date, page, query, device)
);
alter table public.gsc_daily enable row level security;
create policy "gsc_daily admin read" on public.gsc_daily for select using (public.is_admin());

-- ── Pages ───────────────────────────────────────────────────────────────────

-- Which area pages clear the gate. Ids only: the app turns a row into a URL,
-- so moving routes never touches this table.
create table public.indexable_pages (
  id                uuid primary key default gen_random_uuid(),
  page_type         public.indexable_page_type not null,
  profession_id     uuid not null references public.terms (id) on delete cascade,
  term_id           uuid references public.terms (id) on delete cascade,
  area_id           uuid not null references public.areas (id) on delete cascade,
  provider_count    int not null default 0,
  eligible          boolean not null default false,
  last_change       timestamptz,
  computed_at       timestamptz not null default now()
);
create unique index indexable_pages_uniq
  on public.indexable_pages (profession_id, coalesce(term_id, '00000000-0000-0000-0000-000000000000'::uuid), area_id);
create index indexable_pages_eligible_idx on public.indexable_pages (eligible) where eligible;
alter table public.indexable_pages enable row level security;
create policy "indexable_pages readable" on public.indexable_pages for select using (true);
create policy "indexable_pages admin write" on public.indexable_pages for all using (public.is_admin()) with check (public.is_admin());

-- ── Content and settings ────────────────────────────────────────────────────

create table public.settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
create table public.settings_history (
  id         bigint generated always as identity primary key,
  key        text not null,
  old_value  text,
  new_value  text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index settings_history_key_idx on public.settings_history (key, changed_at desc);

-- Page copy: one row per block, value validated against the block's shape in
-- the app (§04 G). scope_term_id ties a block to a profession when it has one.
create table public.content_blocks (
  key           text primary key,
  scope_term_id uuid references public.terms (id) on delete cascade,
  value         jsonb not null,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles (id) on delete set null
);
create table public.content_history (
  id         bigint generated always as identity primary key,
  key        text not null,
  old_value  jsonb,
  new_value  jsonb not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index content_history_key_idx on public.content_history (key, changed_at desc);

create function public.settings_record_history()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.value is not distinct from old.value then
    return new;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  insert into public.settings_history (key, old_value, new_value, changed_by)
  values (new.key, case when tg_op = 'UPDATE' then old.value end, new.value, auth.uid());
  return new;
end;
$$;
create trigger settings_history before insert or update on public.settings
  for each row execute function public.settings_record_history();

create function public.content_record_history()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.value is not distinct from old.value then
    return new;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  insert into public.content_history (key, old_value, new_value, changed_by)
  values (new.key, case when tg_op = 'UPDATE' then old.value end, new.value, auth.uid());
  return new;
end;
$$;
create trigger content_history before insert or update on public.content_blocks
  for each row execute function public.content_record_history();

alter table public.settings enable row level security;
create policy "settings readable" on public.settings for select using (true);
create policy "settings admin write" on public.settings for all using (public.is_admin()) with check (public.is_admin());
alter table public.settings_history enable row level security;
create policy "settings_history admin read" on public.settings_history for select using (public.is_admin());
alter table public.content_blocks enable row level security;
create policy "content_blocks readable" on public.content_blocks for select using (true);
create policy "content_blocks admin write" on public.content_blocks for all using (public.is_admin()) with check (public.is_admin());
alter table public.content_history enable row level security;
create policy "content_history admin read" on public.content_history for select using (public.is_admin());

-- ── Sign-up ─────────────────────────────────────────────────────────────────

create function public.slugify(p_text text)
returns text
language sql immutable
as $$ select trim(both '-' from regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g')); $$;

-- A new auth user gets a profile. A provider also gets their providers row
-- and owner membership in the same transaction (§06.2), tagged with the
-- profession, plan and source the sign-up link carried.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role        public.user_role;
  v_name        text := coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1));
  v_base        text;
  v_slug        text;
  v_provider_id uuid;
  v_profession  uuid;
begin
  -- 'coach' is accepted from old links and means provider.
  v_role := case when new.raw_user_meta_data ->> 'role' in ('provider', 'coach') then 'provider' else 'rider' end;
  insert into public.profiles (id, role, name, email) values (new.id, v_role, v_name, new.email);

  if v_role = 'provider' then
    v_base := coalesce(nullif(public.slugify(v_name), ''), 'provider');
    v_slug := v_base;
    if exists (select 1 from public.providers where slug = v_slug) then
      v_slug := v_base || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
    end if;
    insert into public.providers (slug, name, cohort, acquisition_source)
    values (
      v_slug,
      v_name,
      case when new.raw_user_meta_data ->> 'cohort' = 'founding' then 'founding' else 'open' end,
      nullif(new.raw_user_meta_data ->> 'source', '')
    )
    returning id into v_provider_id;
    insert into public.provider_members (provider_id, user_id, role) values (v_provider_id, new.id, 'owner');

    select t.id into v_profession from public.terms t
    where t.kind = 'profession' and t.slug = coalesce(new.raw_user_meta_data ->> 'profession', 'coaches');
    if v_profession is not null then
      insert into public.provider_terms (provider_id, term_id, sort_order) values (v_provider_id, v_profession, 0);
    end if;
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Search ──────────────────────────────────────────────────────────────────

-- Published providers, optionally within a radius or a state, filtered by
-- professions, disciplines/specialities, skills and attributes: OR within a
-- kind, AND across kinds. Nearest first, then the most matching terms.
create function public.nearby_providers(
  p_profession_ids uuid[] default null,
  p_discipline_ids uuid[] default null,
  p_skill_ids      uuid[] default null,
  p_attribute_ids  uuid[] default null,
  p_lat            double precision default null,
  p_long           double precision default null,
  p_radius_km      double precision default 50,
  p_state          text default null
)
returns table (
  id uuid,
  slug text,
  name text,
  headline text,
  suburb text,
  state text,
  distance_km double precision,
  match_count int
)
language sql stable
as $$
  select
    p.id, p.slug, p.name, p.headline, p.suburb, p.state,
    case
      when p_lat is not null and p_long is not null and p.location is not null
        then st_distance(p.location, st_setsrid(st_makepoint(p_long, p_lat), 4326)::geography) / 1000
    end as distance_km,
    (
      select count(*)::int from public.provider_terms pt
      where pt.provider_id = p.id
        and pt.term_id = any(coalesce(p_discipline_ids, '{}') || coalesce(p_skill_ids, '{}') || coalesce(p_attribute_ids, '{}'))
    ) as match_count
  from public.providers p
  where p.status = 'published'
    and (coalesce(cardinality(p_profession_ids), 0) = 0
      or exists (select 1 from public.provider_terms pt where pt.provider_id = p.id and pt.term_id = any(p_profession_ids)))
    and (coalesce(cardinality(p_discipline_ids), 0) = 0
      or exists (select 1 from public.provider_terms pt where pt.provider_id = p.id and pt.term_id = any(p_discipline_ids)))
    and (coalesce(cardinality(p_skill_ids), 0) = 0
      or exists (select 1 from public.provider_terms pt where pt.provider_id = p.id and pt.term_id = any(p_skill_ids)))
    and (coalesce(cardinality(p_attribute_ids), 0) = 0
      or exists (select 1 from public.provider_terms pt where pt.provider_id = p.id and pt.term_id = any(p_attribute_ids)))
    and (p_lat is null or p_long is null or (
      p.location is not null
      and st_dwithin(p.location, st_setsrid(st_makepoint(p_long, p_lat), 4326)::geography, p_radius_km * 1000)
    ))
    and (p_state is null or upper(p.state) = upper(p_state))
  order by
    (p_lat is not null and p_long is not null) desc,
    distance_km asc nulls last,
    match_count desc,
    p.suburb asc;
$$;
grant execute on function public.nearby_providers to anon, authenticated;

create function public.nearest_postcode(p_lat double precision, p_long double precision)
returns table (postcode text, suburb text, state text, lat double precision, long double precision, distance_km double precision)
language sql stable
as $$
  with near as (
    select p.postcode, p.suburb, p.state, p.lat, p.long,
           st_distance(p.location, st_setsrid(st_makepoint(p_long, p_lat), 4326)::geography) / 1000 as distance_km
    from public.postcodes p
    order by p.location <-> st_setsrid(st_makepoint(p_long, p_lat), 4326)::geography
    limit 12
  )
  select postcode, suburb, state, lat, long, distance_km
  from near
  order by floor(distance_km), (suburb ~* '\m(DC|MC|BC|LPO|PO BOXES|DELIVERY CENTRE|MAIL CENTRE)\M'), length(suburb)
  limit 1;
$$;
grant execute on function public.nearest_postcode to anon, authenticated;

-- ── Events and riders ───────────────────────────────────────────────────────

-- Riders to tell about an event: an active alert for events that follows the
-- event's profession or term (or its door, or nothing in particular), within
-- reach, not already told. Reach is the alert's own radius, or p_reach_km
-- when that is larger (Clinic tier events, §07.2).
create function public.riders_for_event(p_event_id uuid, p_reach_km int default null)
returns table (rider_id uuid, email text, alert_id uuid)
language sql stable
as $$
  select distinct on (ra.rider_id) ra.rider_id, pr.email, ra.id
  from public.events e
  join public.providers p on p.id = e.provider_id and p.status = 'published'
  join public.rider_alerts ra on ra.wants_events and ra.unsubscribed_at is null
  join public.profiles pr on pr.id = ra.rider_id
  left join public.profession_details pd on pd.term_id = e.profession_id
  where e.id = p_event_id
    and pr.email is not null
    and not exists (select 1 from public.notifications_log nl where nl.event_id = e.id and nl.rider_id = ra.rider_id)
    and (cardinality(ra.profession_ids) = 0 or e.profession_id = any(ra.profession_ids))
    and (cardinality(ra.term_ids) = 0 or e.term_id = any(ra.term_ids))
    and (ra.door is null or pd.door is null or ra.door = pd.door)
    and ra.location is not null
    and coalesce(e.location, p.location) is not null
    and st_dwithin(ra.location, coalesce(e.location, p.location), greatest(ra.radius_km, coalesce(p_reach_km, 0)) * 1000)
  order by ra.rider_id, ra.created_at;
$$;

-- "Coming up near you" on a rider's account page.
create function public.events_for_rider(p_rider_id uuid)
returns table (
  id uuid, provider_id uuid, title text, start_date date, end_date date, location_text text,
  provider_name text, provider_slug text, profession_id uuid
)
language sql stable
as $$
  select distinct on (e.start_date, e.id)
    e.id, e.provider_id, e.title, e.start_date, e.end_date, e.location_text, p.name, p.slug, e.profession_id
  from public.rider_alerts ra
  join public.events e on e.start_date >= current_date
  join public.providers p on p.id = e.provider_id and p.status = 'published'
  where ra.rider_id = p_rider_id and ra.unsubscribed_at is null
    and (cardinality(ra.profession_ids) = 0 or e.profession_id = any(ra.profession_ids))
    and (cardinality(ra.term_ids) = 0 or e.term_id = any(ra.term_ids))
    and ra.location is not null and coalesce(e.location, p.location) is not null
    and st_dwithin(ra.location, coalesce(e.location, p.location), ra.radius_km * 1000)
  order by e.start_date, e.id
  limit 10;
$$;

-- ── Area page gate ──────────────────────────────────────────────────────────

-- Rebuilt nightly. Counts published providers per profession and area, and per
-- profession, page-generating term and area; a page is eligible at
-- p_min_providers (the setting, 3 by default). Driven outward from real
-- provider rows, never a cross join of every area.
create function public.recompute_indexable_pages(p_min_providers int default 3)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.indexable_pages;

  insert into public.indexable_pages (page_type, profession_id, term_id, area_id, provider_count, eligible, last_change)
  select 'profession_area', prof.term_id, null, p.area_id,
         count(distinct p.id), count(distinct p.id) >= p_min_providers, max(p.updated_at)
  from public.providers p
  join public.provider_terms prof on prof.provider_id = p.id
  join public.terms tp on tp.id = prof.term_id and tp.kind = 'profession' and tp.active
  where p.status = 'published' and p.area_id is not null
  group by prof.term_id, p.area_id;

  insert into public.indexable_pages (page_type, profession_id, term_id, area_id, provider_count, eligible, last_change)
  select 'profession_term_area', t.parent_id, t.id, p.area_id,
         count(distinct p.id), count(distinct p.id) >= p_min_providers, max(p.updated_at)
  from public.providers p
  join public.provider_terms pt on pt.provider_id = p.id
  join public.terms t on t.id = pt.term_id
    and t.kind = 'discipline' and t.generates_pages and t.active and t.parent_id is not null
  where p.status = 'published' and p.area_id is not null
  group by t.parent_id, t.id, p.area_id;
end;
$$;

-- ── Storage ─────────────────────────────────────────────────────────────────
-- The pre-CMS policies (coach-photos, coach-videos, term-images) live in the
-- storage schema, which the wipe doesn't touch, so they are dropped by name.
drop policy if exists "coach photos are publicly readable" on storage.objects;
drop policy if exists "coaches upload their own photos" on storage.objects;
drop policy if exists "coaches update their own photos" on storage.objects;
drop policy if exists "coaches delete their own photos" on storage.objects;
drop policy if exists "coach videos are publicly readable" on storage.objects;
drop policy if exists "coaches upload their own videos" on storage.objects;
drop policy if exists "coaches update their own videos" on storage.objects;
drop policy if exists "coaches delete their own videos" on storage.objects;
drop policy if exists "term images are publicly readable" on storage.objects;
drop policy if exists "admins upload term images" on storage.objects;

-- Buckets are created by scripts/db/rebuild.mjs through the Storage API. The
-- policies key on the first folder of the object path being a provider the
-- user is a member of (<provider_id>/<file>).

drop policy if exists "provider photos readable" on storage.objects;
drop policy if exists "members write provider photos" on storage.objects;
drop policy if exists "members update provider photos" on storage.objects;
drop policy if exists "members delete provider photos" on storage.objects;
create policy "provider photos readable" on storage.objects for select
  using (bucket_id in ('provider-photos', 'provider-videos'));
create policy "members write provider photos" on storage.objects for insert
  with check (bucket_id in ('provider-photos', 'provider-videos')
    and public.is_provider_member(((storage.foldername(name))[1])::uuid));
create policy "members update provider photos" on storage.objects for update
  using (bucket_id in ('provider-photos', 'provider-videos')
    and public.is_provider_member(((storage.foldername(name))[1])::uuid));
create policy "members delete provider photos" on storage.objects for delete
  using (bucket_id in ('provider-photos', 'provider-videos')
    and public.is_provider_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "term images readable" on storage.objects;
drop policy if exists "admins write term images" on storage.objects;
drop policy if exists "admins update term images" on storage.objects;
drop policy if exists "admins delete term images" on storage.objects;
create policy "term images readable" on storage.objects for select using (bucket_id = 'term-images');
create policy "admins write term images" on storage.objects for insert with check (bucket_id = 'term-images' and public.is_admin());
create policy "admins update term images" on storage.objects for update using (bucket_id = 'term-images' and public.is_admin());
create policy "admins delete term images" on storage.objects for delete using (bucket_id = 'term-images' and public.is_admin());
