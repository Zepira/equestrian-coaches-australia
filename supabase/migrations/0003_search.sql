-- Phase 4: discipline + radius search over published coach profiles.
-- Exposed as an RPC (supabase-js .rpc('nearby_coaches', ...)) rather than
-- a plain table query because it needs a distance calculation and an
-- optional discipline join that a PostgREST filter can't express cleanly.
create or replace function public.nearby_coaches(
  p_discipline_id uuid default null,
  p_lat double precision default null,
  p_long double precision default null,
  p_radius_km double precision default 50
)
returns table (
  id uuid,
  slug text,
  headline text,
  suburb text,
  state text,
  distance_km double precision
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
    end as distance_km
  from public.coach_profiles cp
  where cp.published = true
    and (
      p_discipline_id is null
      or exists (
        select 1 from public.coach_disciplines cd
        where cd.coach_id = cp.id and cd.discipline_id = p_discipline_id
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
    (p_lat is not null and p_long is not null) desc, -- keeps distance-sortable rows first
    distance_km asc nulls last,
    cp.created_at desc;
$$;

grant execute on function public.nearby_coaches to anon, authenticated;
