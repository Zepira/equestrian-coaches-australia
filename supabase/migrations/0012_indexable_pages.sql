-- Phase 9 follow-up: indexable_pages register (per the taxonomy spec's
-- "What earns a page" rule — never generate a doorway page, only build one
-- when there's something real on it). Two page types read this table:
-- /riding-instructors/[area] (all disciplines) and
-- /disciplines/[slug]/[area] (one discipline). A page renders only when
-- its row exists AND eligible = true (coach_count >= 3); otherwise the
-- route redirects to a parent page — never 404s.

create type public.indexable_page_type as enum ('area', 'discipline_area');

create table public.indexable_pages (
  id                 uuid primary key default gen_random_uuid(),
  page_type          public.indexable_page_type not null,
  area_id            uuid not null references public.areas (id) on delete cascade,
  -- null for a plain area page ('area'); set for a discipline+area page
  discipline_id      uuid references public.terms (id) on delete cascade,
  slug               text not null,
  coach_count        int not null default 0,
  eligible           boolean not null default false,
  last_coach_change  timestamptz,
  computed_at        timestamptz not null default now()
);

-- Partial unique indexes rather than one plain unique(area_id, discipline_id)
-- — Postgres treats null != null, so a bare unique constraint would let
-- duplicate 'area' rows (discipline_id null) pile up per area.
create unique index indexable_pages_area_uidx
  on public.indexable_pages (area_id) where discipline_id is null;
create unique index indexable_pages_discipline_area_uidx
  on public.indexable_pages (area_id, discipline_id) where discipline_id is not null;

create index indexable_pages_eligible_idx on public.indexable_pages (eligible) where eligible = true;

alter table public.indexable_pages enable row level security;

-- Read is public — page routes and the sitemap need it under the anon key,
-- and there's nothing sensitive in "how many coaches serve this area".
create policy "indexable pages readable by everyone"
  on public.indexable_pages for select
  using (true);

-- Write is service-role only (the nightly recompute job) or admin, never
-- anon/authenticated — this is a derived table, not something a coach or
-- rider action should ever touch directly.
create policy "indexable pages admin write"
  on public.indexable_pages for all
  using (public.is_admin())
  with check (public.is_admin());

-- Coaches need a resolved area to be countable towards a page at all —
-- coach_profiles.suburb/state is free text entered at signup, areas.slug
-- is the mechanically-normalised suburb+state grouping (0009_areas.sql).
-- Backfilled below by matching on the same normalisation the areas seed
-- used, then kept current going forward by the profile save action
-- (src/app/dashboard/profile/actions.ts) via resolveLocation().
alter table public.coach_profiles add column area_id uuid references public.areas (id);

update public.coach_profiles cp
set area_id = a.id
from public.areas a
where a.state = cp.state
  and a.slug = lower(regexp_replace(lower(trim(cp.suburb)), '[^a-z0-9]+', '-', 'g')) || '-' || lower(cp.state);

-- Full recompute each run rather than incremental upserts — at launch
-- scale (hundreds of coaches, ~400 real pages per the spec's own target)
-- a wholesale delete+reinsert is simpler and cheaper than tracking which
-- rows need invalidating, and it can never leave a stale "eligible" row
-- behind after a coach unpublishes or moves. Driven entirely by an INNER
-- JOIN from real coach_profiles rows outward — never a CROSS JOIN of every
-- area × every discipline, which is exactly the 222k-doorway-page mistake
-- the spec warns against (see CLAUDE.md, "Local SEO").
create or replace function public.recompute_indexable_pages()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.indexable_pages;

  insert into public.indexable_pages
    (page_type, area_id, discipline_id, slug, coach_count, eligible, last_coach_change, computed_at)
  select
    'area',
    cp.area_id,
    null,
    'riding-instructors/' || a.slug,
    count(distinct cp.id),
    count(distinct cp.id) >= 3,
    max(cp.updated_at),
    now()
  from public.coach_profiles cp
  join public.areas a on a.id = cp.area_id
  where cp.published = true and cp.area_id is not null
  group by cp.area_id, a.slug;

  insert into public.indexable_pages
    (page_type, area_id, discipline_id, slug, coach_count, eligible, last_coach_change, computed_at)
  select
    'discipline_area',
    cp.area_id,
    t.id,
    'disciplines/' || t.slug || '/' || a.slug,
    count(distinct cp.id),
    count(distinct cp.id) >= 3,
    max(cp.updated_at),
    now()
  from public.coach_profiles cp
  join public.coach_terms ct on ct.coach_id = cp.id
  join public.terms t on t.id = ct.term_id
    and t.kind = 'discipline' and t.generates_pages = true and t.active = true
  join public.areas a on a.id = cp.area_id
  where cp.published = true and cp.area_id is not null
  group by cp.area_id, t.id, t.slug, a.slug;
end;
$$;

-- Seed it now rather than leaving the table empty until the first cron
-- run — harmless at launch scale (0 real published coaches today) and
-- means the page routes have real rows to read from day one.
select public.recompute_indexable_pages();
