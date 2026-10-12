-- Extra bases (12 Oct 2026; Trello "Profile depth by tier": "MULTIPLE
-- LOCATIONS: Clinic only. For a coach who teaches from two or three bases.
-- Each location gets its own radius and its own place in the area pages ...
-- cap at three.")
--
-- A provider's main base stays on providers (suburb, location, area_id,
-- travel_radius_km). provider_locations holds the extras, at most two, so
-- three bases in all. How many count is the plan's `locations` capability
-- (the plan_capabilities setting; Clinic 3, others 1 by default), read by
-- provider_base_limit(). Extras beyond the plan's number stay saved and
-- dormant: a downgrade deletes nothing, an upgrade brings them back.
--
-- Search (nearby_providers v3) measures from the nearest base that reaches
-- the rider and returns that base's town and point, so a card in Ballarat
-- says Ballarat. Area pages (recompute_indexable_pages) count each base.

create table if not exists public.provider_locations (
  id               uuid primary key default gen_random_uuid(),
  provider_id      uuid not null references public.providers (id) on delete cascade,
  suburb           text not null check (char_length(suburb) between 1 and 80),
  state            text not null,
  postcode         text not null default '',
  area_id          uuid references public.areas (id),
  location         geography(point, 4326) not null,
  lat              double precision not null,
  long             double precision not null,
  travel_radius_km int not null default 30 check (travel_radius_km between 0 and 1000),
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists provider_locations_provider on public.provider_locations (provider_id, sort_order);
create index if not exists provider_locations_location on public.provider_locations using gist (location);

-- Never more than two extras, whatever the plan says.
create or replace function public.provider_locations_cap()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.provider_locations where provider_id = new.provider_id) >= 2 then
    raise exception 'Two extra locations at most (three bases in all).';
  end if;
  return new;
end;
$$;
drop trigger if exists provider_locations_cap on public.provider_locations;
create trigger provider_locations_cap before insert on public.provider_locations
  for each row execute function public.provider_locations_cap();

alter table public.provider_locations enable row level security;
drop policy if exists "provider locations readable" on public.provider_locations;
create policy "provider locations readable" on public.provider_locations for select using (true);
drop policy if exists "members manage provider locations" on public.provider_locations;
create policy "members manage provider locations" on public.provider_locations
  for all using (public.is_provider_member(provider_id)) with check (public.is_provider_member(provider_id));

-- How many bases count for a provider: the `locations` number for their tier
-- in the plan_capabilities setting while the plan is live, else 1. Plans
-- aren't public, so this runs as definer and answers only the number. The
-- fallbacks mirror DEFAULT_CAPABILITIES in src/lib/tiers.ts.
create or replace function public.provider_base_limit(p_provider uuid)
returns int
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (
      select greatest(1, least(3, coalesce(
        nullif((select value from public.settings where key = 'plan_capabilities'), '')::jsonb -> s.tier::text ->> 'locations',
        case s.tier when 'clinic' then '3' else '1' end
      )::int))
      from public.subscriptions s
      where s.provider_id = p_provider and s.status in ('card_saved', 'trialing', 'active')
    ),
    1
  );
$$;
grant execute on function public.provider_base_limit to anon, authenticated;

-- ── nearby_providers v3 ─────────────────────────────────────────────────────
-- As v2 (0003), measured from every counting base. Per provider the base
-- used is the best one: based in the area over travels to it, then nearest.
-- New columns: base_lat, base_long, base_radius_km for the map and the card.
drop function if exists public.nearby_providers(uuid[], uuid[], uuid[], uuid[], double precision, double precision, double precision, text, boolean);

create function public.nearby_providers(
  p_profession_ids uuid[],
  p_discipline_ids uuid[] default null,
  p_skill_ids      uuid[] default null,
  p_attribute_ids  uuid[] default null,
  p_lat            double precision default null,
  p_long           double precision default null,
  p_radius_km      double precision default 50,
  p_state          text default null,
  p_include_remote boolean default true
)
returns table (
  id uuid,
  slug text,
  name text,
  headline text,
  suburb text,
  state text,
  distance_km double precision,
  match_count int,
  based_in boolean,
  is_remote boolean,
  travel_radius_km int,
  profession_id uuid,
  base_lat double precision,
  base_long double precision
)
language sql stable
as $$
  with scope as (
    -- One door or nothing.
    select coalesce(cardinality(p_profession_ids), 0) > 0
       and (select count(distinct pd.door) from public.profession_details pd where pd.term_id = any(p_profession_ids)) = 1 as ok
  ),
  candidates as (
    select
      p.id, p.slug, p.name, p.headline, p.remote,
      prof.term_id as matched_profession,
      coalesce(pd.remote_allowed, false) and p.remote and p_include_remote as remote_ok
    from public.providers p
    cross join scope
    join lateral (
      select pt.term_id from public.provider_terms pt
      where pt.provider_id = p.id and pt.term_id = any(p_profession_ids)
      order by pt.sort_order limit 1
    ) prof on true
    left join public.profession_details pd on pd.term_id = prof.term_id
    where scope.ok
      and p.status = 'published'
      and (coalesce(cardinality(p_discipline_ids), 0) = 0
        or exists (select 1 from public.provider_terms pt where pt.provider_id = p.id and pt.term_id = any(p_discipline_ids)))
      and (coalesce(cardinality(p_skill_ids), 0) = 0
        or exists (select 1 from public.provider_terms pt where pt.provider_id = p.id and pt.term_id = any(p_skill_ids)))
      and (coalesce(cardinality(p_attribute_ids), 0) = 0
        or exists (select 1 from public.provider_terms pt where pt.provider_id = p.id and pt.term_id = any(p_attribute_ids)))
  ),
  bases as (
    -- The main base, then the extras the plan counts.
    select c.*, b.suburb, b.state, b.location, b.lat, b.long, b.travel_radius_km
    from candidates c
    cross join lateral (
      select p.suburb, p.state, p.location, p.lat, p.long, p.travel_radius_km, -1 as ord
      from public.providers p where p.id = c.id
      union all
      select l.suburb, l.state, l.location, l.lat, l.long, l.travel_radius_km, l.sort_order
      from public.provider_locations l
      where l.provider_id = c.id
        and l.id in (
          select x.id from public.provider_locations x where x.provider_id = c.id
          order by x.sort_order, x.created_at limit greatest(public.provider_base_limit(c.id) - 1, 0)
        )
    ) b
  ),
  placed as (
    select b.*,
      case
        when p_lat is not null and p_long is not null and b.location is not null
          then st_distance(b.location, st_setsrid(st_makepoint(p_long, p_lat), 4326)::geography) / 1000
      end as dist
    from bases b
    where p_state is null or upper(b.state) = upper(p_state) or b.remote_ok
  ),
  scored as (
    select pl.*,
      case
        when p_lat is null or p_long is null then true
        else pl.dist is not null and pl.dist <= greatest(p_radius_km, coalesce(pl.travel_radius_km, 0))
      end as reaches,
      p_lat is not null and p_long is not null and pl.dist is not null and pl.dist <= p_radius_km as within
    from placed pl
  ),
  best as (
    -- One row per provider: the base that serves this search best.
    select distinct on (s.id) s.*
    from scored s
    order by s.id, s.within desc, s.reaches desc, s.dist asc nulls last
  )
  select
    bt.id, bt.slug, bt.name, bt.headline, bt.suburb, bt.state,
    bt.dist as distance_km,
    (
      select count(*)::int from public.provider_terms pt
      where pt.provider_id = bt.id
        and pt.term_id = any(coalesce(p_discipline_ids, '{}') || coalesce(p_skill_ids, '{}') || coalesce(p_attribute_ids, '{}'))
    ) as match_count,
    bt.within as based_in,
    bt.remote_ok and not bt.reaches as is_remote,
    bt.travel_radius_km,
    bt.matched_profession as profession_id,
    bt.lat as base_lat,
    bt.long as base_long
  from best bt
  where (bt.reaches or bt.remote_ok)
  order by
    (bt.remote_ok and not bt.reaches) asc,     -- remote last
    bt.within desc,                             -- based in the area above travels to it
    bt.dist asc nulls last,
    match_count desc,
    bt.suburb asc;
$$;
grant execute on function public.nearby_providers to anon, authenticated;

-- ── Area pages count every counting base ───────────────────────────────────
create or replace function public.recompute_indexable_pages(p_min_providers int default 3)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.indexable_pages;

  create temporary table if not exists _provider_areas (provider_id uuid, area_id uuid, updated_at timestamptz) on commit drop;
  delete from _provider_areas;
  insert into _provider_areas
  select p.id, p.area_id, p.updated_at
  from public.providers p
  where p.status = 'published' and p.area_id is not null
  union
  select p.id, l.area_id, greatest(p.updated_at, l.updated_at)
  from public.providers p
  join lateral (
    select x.area_id, x.updated_at from public.provider_locations x
    where x.provider_id = p.id
    order by x.sort_order, x.created_at limit greatest(public.provider_base_limit(p.id) - 1, 0)
  ) l on true
  where p.status = 'published' and l.area_id is not null;

  insert into public.indexable_pages (page_type, profession_id, term_id, area_id, provider_count, eligible, last_change)
  select 'profession_area', prof.term_id, null, a.area_id,
         count(distinct a.provider_id), count(distinct a.provider_id) >= p_min_providers, max(a.updated_at)
  from _provider_areas a
  join public.provider_terms prof on prof.provider_id = a.provider_id
  join public.terms tp on tp.id = prof.term_id and tp.kind = 'profession' and tp.active
  group by prof.term_id, a.area_id;

  insert into public.indexable_pages (page_type, profession_id, term_id, area_id, provider_count, eligible, last_change)
  select 'profession_term_area', t.parent_id, t.id, a.area_id,
         count(distinct a.provider_id), count(distinct a.provider_id) >= p_min_providers, max(a.updated_at)
  from _provider_areas a
  join public.provider_terms pt on pt.provider_id = a.provider_id
  join public.terms t on t.id = pt.term_id
    and t.kind = 'discipline' and t.generates_pages and t.active and t.parent_id is not null
  group by t.parent_id, t.id, a.area_id;
end;
$$;
