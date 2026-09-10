-- Three-tier billing (CLAUDE.md, revised 7 Sep 2026): Listed / Spotlight /
-- Clinic replace the original Standard / Standard+Clinics pair.
--
-- The enum values themselves are added OUTSIDE this file — `alter type …
-- add value` cannot run inside a transaction and the migration runner sends
-- a file as one — with:
--   alter type public.subscription_tier add value if not exists 'listed';
--   alter type public.subscription_tier add value if not exists 'spotlight';
--   alter type public.subscription_tier add value if not exists 'clinic';
-- The old values stay in the enum (Postgres can't drop them cheaply); no
-- row keeps them after the backfill below, and the app only writes the new
-- three.

update public.coach_profiles set subscription_tier = 'listed'
  where subscription_tier = 'standard';
update public.coach_profiles set subscription_tier = 'clinic'
  where subscription_tier = 'standard_plus_clinics';

-- Clinics RLS: every paid tier can manage its own clinics now (Listed gets
-- one live event, enforced in the app; Spotlight and Clinic are unlimited).
drop policy if exists "clinics tier coaches manage their own clinics" on public.clinics;
create policy "subscribed coaches manage their own clinics"
  on public.clinics for all
  using (
    auth.uid() = coach_id
    and exists (
      select 1 from public.coach_profiles cp
      where cp.id = auth.uid()
        and cp.subscription_status = 'active'
        and cp.subscription_tier in ('listed', 'spotlight', 'clinic')
    )
  )
  with check (
    auth.uid() = coach_id
    and exists (
      select 1 from public.coach_profiles cp
      where cp.id = auth.uid()
        and cp.subscription_status = 'active'
        and cp.subscription_tier in ('listed', 'spotlight', 'clinic')
    )
  );
