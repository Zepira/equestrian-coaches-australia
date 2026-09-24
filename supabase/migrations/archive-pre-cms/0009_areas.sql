-- Phase 9: areas, not postcodes. 18.5k postcodes is a data source, not a
-- page structure — riders search place names (Geelong, the Hunter
-- Valley), not postcodes. postcodes map into areas.
create type public.area_kind as enum ('suburb', 'town', 'region', 'state');

create table public.areas (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  kind               public.area_kind not null,
  state              text not null,
  parent_id          uuid references public.areas (id),
  centroid           geography(point, 4326) not null,
  default_radius_km  int not null default 50,
  -- hand-written, ~150 words. Only the top 20 (by coach count, once real
  -- coaches exist) need one to start — most launch with blank intro.
  intro              text not null default '',
  active             boolean not null default true
);

alter table public.postcodes add column area_id uuid references public.areas (id);

alter table public.areas enable row level security;
create policy "areas readable" on public.areas
  for select using (active = true or public.is_admin());
create policy "areas admin write" on public.areas
  for all using (public.is_admin()) with check (public.is_admin());

-- ── mechanical population: one area per distinct suburb+state, centroid
-- averaged across its postcode rows. This is a starting point, not the
-- final area structure — multi-suburb regions ("Mornington Peninsula")
-- need hand curation later and aren't attempted here (see CLAUDE.md).
-- Group on lower(trim(suburb)) rather than the raw string: the postcode
-- dataset has case/whitespace variants of the same suburb name that would
-- otherwise collide on slug after normalisation (e.g. two spellings both
-- reducing to "o-connell-nsw").
insert into public.areas (slug, name, kind, state, centroid, intro)
select
  lower(regexp_replace(lower(trim(suburb)), '[^a-z0-9]+', '-', 'g')) || '-' || lower(state) as slug,
  initcap(lower(trim(suburb))) as name,
  'suburb'::public.area_kind,
  state,
  ST_SetSRID(ST_MakePoint(avg(long), avg(lat)), 4326)::geography as centroid,
  ''
from public.postcodes
group by lower(trim(suburb)), state
-- Real-world suburb-name data still collides occasionally after
-- normalisation (accents/punctuation edge cases) — first one wins,
-- rare enough not to be worth a fussier slug algorithm at seed time.
on conflict (slug) do nothing;

update public.postcodes p
set area_id = a.id
from public.areas a
where a.state = p.state
  and a.slug = lower(regexp_replace(lower(trim(p.suburb)), '[^a-z0-9]+', '-', 'g')) || '-' || lower(p.state);
