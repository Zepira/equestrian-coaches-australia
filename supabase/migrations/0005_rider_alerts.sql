-- CMS build stage 6 (The Site as a CMS §07): alerts for any profession, new
-- providers as well as events, a monthly email, and one-click unsubscribe.

-- ── Unsubscribe tokens ──────────────────────────────────────────────────────
-- Every email carries a link that works without logging in. An alert's own
-- token stops that alert; a rider's token (in the monthly email) stops every
-- alert they have. Random, unguessable, never shown anywhere but the email.
alter table public.rider_alerts
  add column if not exists unsubscribe_token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
alter table public.profiles
  add column if not exists email_token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

-- ── Events → riders: now with the alert's token ────────────────────────────
-- Same matching as the baseline (profession, term, door, within the alert's
-- radius or p_reach_km for Clinic-tier events, not told before); returns the
-- alert's unsubscribe token for the email.
drop function if exists public.riders_for_event(uuid, int);
create function public.riders_for_event(p_event_id uuid, p_reach_km int default null)
returns table (rider_id uuid, email text, alert_id uuid, unsubscribe_token text)
language sql stable
as $$
  select distinct on (ra.rider_id) ra.rider_id, pr.email, ra.id, ra.unsubscribe_token
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

-- ── A newly published provider → riders who asked (§07.1) ───────────────────
-- "Tell me when a barefoot trimmer starts working near Kyneton": alerts that
-- want new providers, match the provider's professions (or door) and terms,
-- and are within the alert's radius or the provider's own travel radius.
-- Each rider hears about a provider once (notifications_log).
create or replace function public.riders_for_provider(p_provider_id uuid)
returns table (rider_id uuid, email text, alert_id uuid, unsubscribe_token text)
language sql stable
as $$
  with prov as (
    select p.id, p.location, coalesce(p.travel_radius_km, 0) as travel,
           array_agg(pt.term_id) filter (where t.kind = 'profession') as professions,
           array_agg(pt.term_id) filter (where t.kind <> 'profession') as terms,
           array_agg(distinct pd.door) filter (where pd.door is not null) as doors
    from public.providers p
    join public.provider_terms pt on pt.provider_id = p.id
    join public.terms t on t.id = pt.term_id
    left join public.profession_details pd on pd.term_id = t.id
    where p.id = p_provider_id and p.status = 'published' and p.location is not null
    group by p.id, p.location, p.travel_radius_km
  )
  select distinct on (ra.rider_id) ra.rider_id, pr.email, ra.id, ra.unsubscribe_token
  from prov
  join public.rider_alerts ra on ra.wants_new_providers and ra.unsubscribed_at is null and ra.location is not null
  join public.profiles pr on pr.id = ra.rider_id and pr.email is not null
  where (cardinality(ra.profession_ids) = 0 or ra.profession_ids && coalesce(prov.professions, '{}'))
    and (cardinality(ra.term_ids) = 0 or ra.term_ids && coalesce(prov.terms, '{}'))
    and (ra.door is null or ra.door = any(coalesce(prov.doors, '{}')))
    and st_dwithin(ra.location, prov.location, greatest(ra.radius_km, prov.travel) * 1000)
    and not exists (
      select 1 from public.notifications_log nl
      where nl.rider_id = ra.rider_id and nl.provider_id = prov.id and nl.kind = 'new_provider'
    )
  order by ra.rider_id, ra.created_at;
$$;

-- ── "Coming up near you": every profession followed, doors respected ────────
drop function if exists public.events_for_rider(uuid);
create function public.events_for_rider(p_rider_id uuid, p_within_days int default null)
returns table (
  id uuid, provider_id uuid, title text, start_date date, end_date date, location_text text,
  provider_name text, provider_slug text, profession_id uuid, door public.door
)
language sql stable
as $$
  select distinct on (e.start_date, e.id)
    e.id, e.provider_id, e.title, e.start_date, e.end_date, e.location_text, p.name, p.slug, e.profession_id, pd.door
  from public.rider_alerts ra
  join public.events e on e.start_date >= current_date
    and (p_within_days is null or e.start_date <= current_date + p_within_days)
  join public.providers p on p.id = e.provider_id and p.status = 'published'
  left join public.profession_details pd on pd.term_id = e.profession_id
  where ra.rider_id = p_rider_id and ra.unsubscribed_at is null and ra.wants_events
    and (cardinality(ra.profession_ids) = 0 or e.profession_id = any(ra.profession_ids))
    and (cardinality(ra.term_ids) = 0 or e.term_id = any(ra.term_ids))
    and (ra.door is null or pd.door is null or ra.door = pd.door)
    and ra.location is not null and coalesce(e.location, p.location) is not null
    and st_dwithin(ra.location, coalesce(e.location, p.location), ra.radius_km * 1000)
  order by e.start_date, e.id
  limit 10;
$$;

-- ── New providers near a rider since a date (the monthly email) ────────────
create or replace function public.new_providers_for_rider(p_rider_id uuid, p_since timestamptz)
returns table (id uuid, slug text, name text, suburb text, state text, profession_id uuid, door public.door)
language sql stable
as $$
  select distinct on (p.id) p.id, p.slug, p.name, p.suburb, p.state, prof.term_id, pd.door
  from public.rider_alerts ra
  join public.providers p on p.status = 'published' and p.published_at >= p_since and p.location is not null
  join lateral (
    select pt.term_id from public.provider_terms pt join public.terms t on t.id = pt.term_id and t.kind = 'profession'
    where pt.provider_id = p.id order by pt.sort_order limit 1
  ) prof on true
  left join public.profession_details pd on pd.term_id = prof.term_id
  where ra.rider_id = p_rider_id and ra.unsubscribed_at is null and ra.wants_new_providers and ra.location is not null
    and (cardinality(ra.profession_ids) = 0 or exists (
      select 1 from public.provider_terms pt where pt.provider_id = p.id and pt.term_id = any(ra.profession_ids)))
    and (cardinality(ra.term_ids) = 0 or exists (
      select 1 from public.provider_terms pt where pt.provider_id = p.id and pt.term_id = any(ra.term_ids)))
    and (ra.door is null or ra.door = pd.door)
    and st_dwithin(ra.location, p.location, greatest(ra.radius_km, coalesce(p.travel_radius_km, 0)) * 1000)
  order by p.id
  limit 12;
$$;

grant execute on function public.events_for_rider to authenticated;
