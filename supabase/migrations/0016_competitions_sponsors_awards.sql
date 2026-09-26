-- The Marketing Engine stage F: M10 competitions, M11 sponsors, and the
-- riders' choice award. Admin writes, public reads only what's published;
-- entries and anything about a person are service-role only.

-- ── M10 competitions ─────────────────────────────────────────────────────
-- Judged on skill by default (no permit anywhere). A random draw is refused
-- over $3,000 in total prizes (the ACT permit threshold, the lowest in
-- Australia; checked in src/lib/competitions.ts and here).
create table if not exists public.competitions (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title              text not null check (length(title) between 1 and 120),
  summary            text not null default '',
  -- What entrants do, e.g. "In 25 words or fewer, tell us…"
  question           text not null default '',
  prize              text not null default '',
  prize_value_cents  integer not null default 0 check (prize_value_cents >= 0),
  judging            text not null default 'skill' check (judging in ('skill', 'draw')),
  -- For a skill competition: the published criteria the entries are judged on.
  criteria           text not null default '',
  who_can_enter      text not null default '',
  opens_at           timestamptz,
  closes_at          timestamptz,
  winners_by         date,
  how_winners_told   text not null default '',
  winner_count       smallint not null default 1 check (winner_count between 1 and 20),
  image_path         text,
  image_alt          text not null default '',
  status             text not null default 'draft' check (status in ('draft', 'published', 'judged')),
  -- The judging record: who judged, when, and how they decided.
  judged_at          timestamptz,
  judged_by          uuid references public.profiles (id) on delete set null,
  judging_note       text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint competitions_draw_limit check (judging = 'skill' or prize_value_cents <= 300000)
);
alter table public.competitions enable row level security;
drop policy if exists "competitions public read" on public.competitions;
create policy "competitions public read" on public.competitions for select using (status <> 'draft' or public.is_admin());
drop policy if exists "competitions admin write" on public.competitions;
create policy "competitions admin write" on public.competitions for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists competitions_change_log on public.competitions;
create trigger competitions_change_log after insert or update or delete on public.competitions for each row execute function public.record_change();

create table if not exists public.competition_entries (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid not null references public.competitions (id) on delete cascade,
  contact_id      uuid references public.contacts (id) on delete set null,
  name            text not null check (length(name) between 1 and 80),
  email           text not null,
  state           text,
  answer          text not null check (length(answer) between 1 and 2000),
  -- 18 or over, or entered by a parent or guardian (named).
  age_ok          boolean not null,
  parent_name     text,
  -- The separate, unticked box. Recorded as consent only once they confirm their email.
  wants_news      boolean not null default false,
  -- The words of the box they saw (consent_wordings), recorded as consent on confirm.
  news_wording_id uuid references public.consent_wordings (id) on delete set null,
  confirm_token   text not null unique default encode(gen_random_bytes(18), 'hex'),
  confirmed_at    timestamptz,
  device_hash     text,
  flags           text[] not null default '{}',
  disqualified    text,
  winner_rank     smallint,
  created_at      timestamptz not null default now()
);
alter table public.competition_entries add column if not exists news_wording_id uuid references public.consent_wordings (id) on delete set null;
create unique index if not exists competition_entries_one_each on public.competition_entries (competition_id, lower(email));
create index if not exists competition_entries_comp on public.competition_entries (competition_id, created_at);
alter table public.competition_entries enable row level security;
drop policy if exists "competition entries admin" on public.competition_entries;
create policy "competition entries admin" on public.competition_entries for all using (public.is_admin()) with check (public.is_admin());

-- ── M11 sponsors ─────────────────────────────────────────────────────────
create table if not exists public.sponsors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(name) between 1 and 80),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  website       text not null default '',
  contact_email text not null default '',
  notes         text not null default '',
  created_at    timestamptz not null default now()
);
-- Every slot shows "Sponsored", never sits inside a list of professionals,
-- and is the same for everyone who sees it (no rider data).
create table if not exists public.sponsor_slots (
  id          uuid primary key default gen_random_uuid(),
  sponsor_id  uuid not null references public.sponsors (id) on delete cascade,
  placement   text not null check (placement in ('newsletter', 'guide', 'profession', 'area')),
  -- Which guide, profession or area; null means every one of that kind.
  guide_id      uuid references public.guides (id) on delete cascade,
  profession_id uuid references public.terms (id) on delete cascade,
  area_id       uuid references public.areas (id) on delete cascade,
  headline    text not null check (length(headline) between 1 and 90),
  body        text not null default '' check (length(body) <= 300),
  image_path  text,
  link_label  text not null default 'Find out more',
  link_id     uuid references public.links (id) on delete set null,
  starts_on   date not null,
  ends_on     date not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index if not exists sponsor_slots_live on public.sponsor_slots (placement, starts_on, ends_on) where active;
-- Times a slot was shown, a row per slot per day (the monthly report).
create table if not exists public.sponsor_impressions (
  slot_id uuid not null references public.sponsor_slots (id) on delete cascade,
  day     date not null default current_date,
  views   integer not null default 0,
  primary key (slot_id, day)
);
alter table public.sponsors enable row level security;
alter table public.sponsor_slots enable row level security;
alter table public.sponsor_impressions enable row level security;
drop policy if exists "sponsors admin" on public.sponsors;
create policy "sponsors admin" on public.sponsors for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "sponsor slots admin" on public.sponsor_slots;
create policy "sponsor slots admin" on public.sponsor_slots for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "sponsor impressions admin" on public.sponsor_impressions;
create policy "sponsor impressions admin" on public.sponsor_impressions for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists sponsors_change_log on public.sponsors;
create trigger sponsors_change_log after insert or update or delete on public.sponsors for each row execute function public.record_change();
drop trigger if exists sponsor_slots_change_log on public.sponsor_slots;
create trigger sponsor_slots_change_log after insert or update or delete on public.sponsor_slots for each row execute function public.record_change();

create or replace function public.count_sponsor_view(p_slot uuid)
returns void language sql security definer set search_path = public as $$
  insert into sponsor_impressions (slot_id, day, views) values (p_slot, current_date, 1)
  on conflict (slot_id, day) do update set views = sponsor_impressions.views + 1;
$$;
revoke all on function public.count_sponsor_view(uuid) from public, anon, authenticated;

-- A sponsor's link goes to their own site, the one kind of tracked link
-- that may leave this one (admins make them; everything else stays on-site).
alter table public.links drop constraint if exists links_destination_check;
alter table public.links add constraint links_destination_check check (destination ~ '^/' or (coalesce(kind, '') = 'sponsor' and destination ~ '^https://'));
-- (coalesce: a CHECK that comes out NULL passes, so a link with no kind would otherwise slip through.)

-- ── the riders' choice award ─────────────────────────────────────────────
-- Worked out from reviews and saves by the published rules (src/lib/awards.ts);
-- the plan someone is on never counts. Published winners are public.
create table if not exists public.awards (
  id            uuid primary key default gen_random_uuid(),
  year          smallint not null check (year between 2026 and 2100),
  profession_id uuid not null references public.terms (id) on delete cascade,
  state         text not null,
  provider_id   uuid not null references public.providers (id) on delete cascade,
  score         numeric not null,
  reviews       integer not null,
  average       numeric not null,
  saves         integer not null,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (year, profession_id, state)
);
alter table public.awards enable row level security;
drop policy if exists "awards public read" on public.awards;
create policy "awards public read" on public.awards for select using (published_at is not null or public.is_admin());
drop policy if exists "awards admin write" on public.awards;
create policy "awards admin write" on public.awards for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists awards_change_log on public.awards;
create trigger awards_change_log after insert or update or delete on public.awards for each row execute function public.record_change();

insert into storage.buckets (id, name, public) values ('marketing-files', 'marketing-files', true) on conflict (id) do nothing;

-- New top-level pages: no profession may take their words.
alter table public.terms drop constraint if exists terms_profession_slug_not_reserved;
alter table public.terms add constraint terms_profession_slug_not_reserved check (
  kind <> 'profession' or slug not in (
    'about', 'account', 'admin', 'api', 'auth', 'clinics', 'dashboard', 'disciplines', 'events',
    'for-coaches', 'for-professionals', 'forgot-password', 'horse-care', 'icon.png', 'apple-icon.png', 'join',
    'list-your-business', 'login', 'profile', 'reset-password', 'riding-instructors', 'robots.txt', 'search',
    'signup', 'sitemap.xml', 'brand', 'hero', 'vendor', '_next', 'onboarding', 'unsubscribe', 'terms', 'privacy',
    'go', 'p', 'email-preferences', 'alerts', 'how-we-list', 'guides', 'review', 'reviews', 'review-policy', 'enquiry',
    'competitions', 'riders-choice'
  )
);
