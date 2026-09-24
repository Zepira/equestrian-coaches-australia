-- CMS build stage 7 (The Site as a CMS §08): every measurement carries the
-- profession; the month's numbers are frozen per provider per profession;
-- benchmarks compare a provider with their own profession only; and the
-- monthly email can say what people near them searched for.

-- ── provider_events: dedupe per section ────────────────────────────────────
-- A provider in two professions who shows up in both sections on the same day
-- counts once in each, so the dedupe key now includes the profession.
drop index if exists public.provider_events_dedupe;
create unique index provider_events_dedupe
  on public.provider_events (provider_id, kind, visitor_hash, event_day, profession_id);

-- ── Month stats: frozen on the 1st, emailed once ────────────────────────────
alter table public.provider_month_stats add column if not exists emailed_at timestamptz;

-- Totals for one month, per provider and profession, from provider_events and
-- enquiries. Re-running updates the numbers and keeps emailed_at.
create or replace function public.freeze_month_stats(p_month date)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_from timestamptz := date_trunc('month', p_month::timestamp) at time zone 'UTC';
  v_to   timestamptz := (date_trunc('month', p_month::timestamp) + interval '1 month') at time zone 'UTC';
  v_rows int;
begin
  insert into public.provider_month_stats (provider_id, profession_id, month, impressions, views, reveals, enquiries, frozen_at)
  select provider_id, profession_id, date_trunc('month', p_month::timestamp)::date,
         sum(impressions)::int, sum(views)::int, sum(reveals)::int, sum(enquiries)::int, now()
  from (
    select provider_id, profession_id,
           count(*) filter (where kind = 'impression') as impressions,
           count(*) filter (where kind = 'view') as views,
           count(*) filter (where kind = 'reveal') as reveals,
           0 as enquiries
    from public.provider_events
    where created_at >= v_from and created_at < v_to
    group by provider_id, profession_id
    union all
    select provider_id, profession_id, 0, 0, 0, count(*)
    from public.enquiries
    where created_at >= v_from and created_at < v_to
    group by provider_id, profession_id
  ) t
  group by provider_id, profession_id
  on conflict (provider_id, coalesce(profession_id, '00000000-0000-0000-0000-000000000000'::uuid), month)
  do update set impressions = excluded.impressions, views = excluded.views, reveals = excluded.reveals,
                enquiries = excluded.enquiries, frozen_at = excluded.frozen_at;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- ── Benchmarks, within a profession (§08.1) ─────────────────────────────────
-- The median month for published providers of one profession: a farrier is
-- compared with farriers, never with coaches. Only aggregates leave the
-- function, and nothing when fewer than p_min providers had numbers (too few
-- to be a benchmark, and too few to stay anonymous).
create or replace function public.profession_benchmark(p_profession_id uuid, p_month date, p_min int default 5)
returns table (providers int, median_views numeric, median_enquiries numeric)
language sql stable security definer set search_path = public
as $$
  with m as (
    select s.views, s.enquiries
    from public.provider_month_stats s
    join public.providers p on p.id = s.provider_id and p.status = 'published'
    where s.profession_id = p_profession_id and s.month = date_trunc('month', p_month::timestamp)::date
  )
  select count(*)::int,
         percentile_cont(0.5) within group (order by views)::numeric,
         percentile_cont(0.5) within group (order by enquiries)::numeric
  from m
  having count(*) >= p_min;
$$;
grant execute on function public.profession_benchmark to authenticated;

-- ── What people near a provider searched for (the monthly email) ───────────
-- On-site searches in the provider's own professions, within p_km of them,
-- in a date range: the most searched terms and the places they were
-- searched from. Search Console's queries join this once it's connected.
create or replace function public.local_search_terms(p_provider_id uuid, p_from timestamptz, p_to timestamptz, p_km int default 50)
returns table (term text, place text, searches int)
language sql stable security definer set search_path = public
as $$
  with me as (
    select p.location,
           array_agg(pt.term_id) filter (where t.kind = 'profession') as professions
    from public.providers p
    join public.provider_terms pt on pt.provider_id = p.id
    join public.terms t on t.id = pt.term_id
    where p.id = p_provider_id and p.location is not null
    group by p.location
  )
  select t.name, coalesce(nullif(se.location_text, ''), 'anywhere'), count(*)::int
  from me
  join public.search_events se
    on se.created_at >= p_from and se.created_at < p_to
   and se.profession_id = any(me.professions)
   and se.lat is not null and se.lng is not null
   and st_dwithin(me.location, st_setsrid(st_makepoint(se.lng, se.lat), 4326)::geography, p_km * 1000)
  cross join lateral unnest(se.term_ids) as tid
  join public.terms t on t.id = tid and t.kind = 'discipline'
  group by t.name, coalesce(nullif(se.location_text, ''), 'anywhere')
  order by count(*) desc, t.name
  limit 3;
$$;
grant execute on function public.local_search_terms to authenticated;
