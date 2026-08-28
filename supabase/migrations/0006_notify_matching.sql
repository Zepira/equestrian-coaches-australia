-- Phase 6: which riders should hear about a given clinic — followed the
-- clinic's discipline, or within 100km of the coach. Called from
-- src/lib/notifications.ts under the service-role key (bypasses RLS by
-- design; this is server-only matching, never exposed to anon/authenticated).
create or replace function public.matching_riders_for_clinic(p_clinic_id uuid)
returns table (rider_id uuid, email text)
language sql
stable
as $$
  select distinct rp.rider_id, p.email
  from public.clinics c
  join public.coach_profiles cp on cp.id = c.coach_id
  join public.rider_preferences rp on true
  join public.profiles p on p.id = rp.rider_id
  where c.id = p_clinic_id
    and p.email is not null
    and not exists (
      select 1 from public.notifications_log nl
      where nl.clinic_id = c.id and nl.rider_id = rp.rider_id
    )
    and (
      (c.discipline_id is not null and c.discipline_id = any(rp.followed_discipline_ids))
      or (
        rp.location is not null and cp.location is not null
        and st_dwithin(rp.location, cp.location, 100000)
      )
    );
$$;
