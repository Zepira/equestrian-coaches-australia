-- CMS build stage 4 (The Site as a CMS §05.1, §05.2, §05.6): search that
-- knows professions, travel radius and remote work; the featured block's
-- candidates; and the check that every published provider is on some page.

-- ── nearby_providers v2 ─────────────────────────────────────────────────────
-- Changes from the baseline:
--   * profession ids are required, and must all belong to one door: search
--     never mixes coaches and horse care in one list (returns nothing if
--     asked to).
--   * a point search reaches a provider within the rider's radius (based in
--     the area) or whose own travel radius reaches the point (travels to
--     it). Based-in ranks above travels-to, whatever the distances.
--   * remote providers: only where their matched profession allows remote
--     (profession_details.remote_allowed), only when the caller asks
--     (p_include_remote; place pages pass false), always ranked last.
--   * returns based_in, is_remote, travel_radius_km and the profession the
--     provider matched on.
drop function if exists public.nearby_providers(uuid[], uuid[], uuid[], uuid[], double precision, double precision, double precision, text);

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
  profession_id uuid
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
      p.*,
      prof.term_id as matched_profession,
      coalesce(pd.remote_allowed, false) and p.remote and p_include_remote as remote_ok,
      case
        when p_lat is not null and p_long is not null and p.location is not null
          then st_distance(p.location, st_setsrid(st_makepoint(p_long, p_lat), 4326)::geography) / 1000
      end as dist
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
  placed as (
    select c.*,
      case
        when p_lat is null or p_long is null then true
        else c.dist is not null and c.dist <= greatest(p_radius_km, coalesce(c.travel_radius_km, 0))
      end as reaches,
      p_lat is not null and p_long is not null and c.dist is not null and c.dist <= p_radius_km as within
    from candidates c
  )
  select
    pl.id, pl.slug, pl.name, pl.headline, pl.suburb, pl.state,
    pl.dist as distance_km,
    (
      select count(*)::int from public.provider_terms pt
      where pt.provider_id = pl.id
        and pt.term_id = any(coalesce(p_discipline_ids, '{}') || coalesce(p_skill_ids, '{}') || coalesce(p_attribute_ids, '{}'))
    ) as match_count,
    pl.within as based_in,
    pl.remote_ok and not pl.reaches as is_remote,
    pl.travel_radius_km,
    pl.matched_profession as profession_id
  from placed pl
  where (pl.reaches or pl.remote_ok)
    and (p_state is null or upper(pl.state) = upper(p_state) or pl.remote_ok)
  order by
    (pl.remote_ok and not pl.reaches) asc,     -- remote last
    pl.within desc,                             -- based in the area above travels to it
    pl.dist asc nulls last,
    match_count desc,
    pl.suburb asc;
$$;
grant execute on function public.nearby_providers to anon, authenticated;

-- ── Featured candidates ─────────────────────────────────────────────────────
-- Which of these providers are on a plan with a featured slot. Plans aren't
-- public (subscriptions is members-only under RLS), so this answers only the
-- yes/no the featured block needs. Which plans carry a slot is the
-- plan_capabilities setting; the caller passes the tiers.
create or replace function public.featured_candidates(p_provider_ids uuid[], p_tiers text[])
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select s.provider_id from public.subscriptions s
  where s.provider_id = any(p_provider_ids)
    and s.tier::text = any(p_tiers)
    and s.status in ('card_saved', 'trialing', 'active');
$$;
grant execute on function public.featured_candidates to anon, authenticated;

-- ── The fallback ladder's assertion (§05.2) ─────────────────────────────────
-- Every published provider should be listed on at least one page besides
-- its own profile: a horse care provider on its live profession's section;
-- a coach on a discipline page (the coaches door lists by discipline); a
-- remote provider on the same. Anyone this returns is findable only by
-- search or a direct link. Should always be empty; the weekly digest says
-- so either way.
create or replace function public.unlisted_providers()
returns table (id uuid, slug text, name text, reason text)
language sql stable
as $$
  with prof as (
    select distinct on (pt.provider_id) pt.provider_id, pt.term_id, pd.door, pd.launch_state
    from public.provider_terms pt
    join public.terms t on t.id = pt.term_id and t.kind = 'profession'
    left join public.profession_details pd on pd.term_id = t.id
    order by pt.provider_id, pt.sort_order
  )
  select p.id, p.slug, p.name,
    case
      when prof.provider_id is null then 'no profession'
      when prof.launch_state is distinct from 'live' then 'profession not live'
      else 'no discipline tagged'
    end as reason
  from public.providers p
  left join prof on prof.provider_id = p.id
  where p.status = 'published'
    and (
      prof.provider_id is null
      or prof.launch_state is distinct from 'live'
      or (prof.door = 'coaches' and not exists (
        select 1 from public.provider_terms pt
        join public.terms t on t.id = pt.term_id and t.kind = 'discipline' and t.active and t.parent_id = prof.term_id
        where pt.provider_id = p.id))
    );
$$;
grant execute on function public.unlisted_providers to authenticated;
