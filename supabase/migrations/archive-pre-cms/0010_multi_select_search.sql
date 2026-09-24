-- Phase 9: multi-select search — "dressage or show jumping" AND "travels
-- to you" AND "confidence building". OR within a kind, AND across kinds.
-- One flat array + match-all flag can't express that, so three arrays.
drop function if exists public.nearby_coaches(uuid, double precision, double precision, double precision);

create or replace function public.nearby_coaches(
  p_discipline_ids uuid[] default null,
  p_skill_ids      uuid[] default null,
  p_attribute_ids  uuid[] default null,
  p_lat            double precision default null,
  p_long           double precision default null,
  p_radius_km      double precision default 50
)
returns table (
  id uuid,
  slug text,
  headline text,
  suburb text,
  state text,
  distance_km double precision,
  match_count int
)
language sql
stable
as $$
  select
    cp.id,
    cp.slug,
    cp.headline,
    cp.suburb,
    cp.state,
    case
      when p_lat is not null and p_long is not null and cp.location is not null
        then st_distance(cp.location, st_setsrid(st_makepoint(p_long, p_lat), 4326)::geography) / 1000
      else null
    end as distance_km,
    -- how many of the selected terms (across all three kinds) this coach
    -- matches, so a coach ticking 4 of 5 filters ranks above one ticking 2
    (
      select count(*)::int from public.coach_terms ct
      where ct.coach_id = cp.id
        and ct.term_id = any(
          coalesce(p_discipline_ids, '{}') || coalesce(p_skill_ids, '{}') || coalesce(p_attribute_ids, '{}')
        )
    ) as match_count
  from public.coach_profiles cp
  where cp.published = true
    and (
      p_discipline_ids is null or cardinality(p_discipline_ids) = 0
      or exists (
        select 1 from public.coach_terms ct
        where ct.coach_id = cp.id and ct.term_id = any(p_discipline_ids)
      )
    )
    and (
      p_skill_ids is null or cardinality(p_skill_ids) = 0
      or exists (
        select 1 from public.coach_terms ct
        where ct.coach_id = cp.id and ct.term_id = any(p_skill_ids)
      )
    )
    and (
      p_attribute_ids is null or cardinality(p_attribute_ids) = 0
      or exists (
        select 1 from public.coach_terms ct
        where ct.coach_id = cp.id and ct.term_id = any(p_attribute_ids)
      )
    )
    and (
      p_lat is null or p_long is null
      or (
        cp.location is not null
        and st_dwithin(
          cp.location,
          st_setsrid(st_makepoint(p_long, p_lat), 4326)::geography,
          p_radius_km * 1000
        )
      )
    )
  order by
    (p_lat is not null and p_long is not null) desc,
    distance_km asc nulls last,
    match_count desc;
$$;

grant execute on function public.nearby_coaches to anon, authenticated;
