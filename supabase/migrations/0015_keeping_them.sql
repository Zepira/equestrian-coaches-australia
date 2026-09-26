-- The Marketing Engine stage E: keeping professionals and riders.
--
-- RUN THIS FIRST, ON ITS OWN (an enum can't grow inside the migration
-- runner's transaction):
--   node scripts/db/run-migration.mjs --query "alter type public.subscription_status add value if not exists 'paused'"

-- ── pause, cancel and plan changes ────────────────────────────────────────
-- paused: no charges and the profile hidden until paused_until, when it comes
-- back by itself (Stripe's pause_collection; the daily job in mock mode).
alter table public.subscriptions add column if not exists paused_until timestamptz;
-- A cancel waits for the end of the paid period; canceled_at is when it ended.
alter table public.subscriptions add column if not exists cancel_at timestamptz;
alter table public.subscriptions add column if not exists canceled_at timestamptz;
alter table public.subscriptions add column if not exists cancel_reason text check (length(cancel_reason) <= 60);
-- The last time the professional chose a plan or billing period themselves.
-- The founding conversion emails stop once they've chosen.
alter table public.subscriptions add column if not exists plan_changed_at timestamptz;

-- ── the quiet rider check ────────────────────────────────────────────────
-- Riders we still email (alerts or the round-up) who haven't done anything
-- we can see for p_days: signed in, clicked an email, changed an alert,
-- saved someone or sent an enquiry. Service role only.
create or replace function public.quiet_riders(p_days integer)
returns table (profile_id uuid, email text, last_active timestamptz)
language sql stable security definer set search_path = public, auth
as $$
  with activity as (
    select p.id, c.email, c.id as contact_id,
      greatest(
        p.created_at,
        coalesce(u.last_sign_in_at, p.created_at),
        coalesce((select max(e.created_at) from email_events e where e.contact_id = c.id and e.type = 'clicked'), p.created_at),
        coalesce((select max(ra.updated_at) from rider_alerts ra where ra.rider_id = p.id), p.created_at),
        coalesce((select max(f.created_at) from favourites f where f.rider_id = p.id), p.created_at),
        coalesce((select max(q.created_at) from enquiries q where q.rider_id = p.id), p.created_at)
      ) as last_active
    from profiles p
    join contacts c on c.profile_id = p.id
    left join auth.users u on u.id = p.id
    where p.role = 'rider'
  )
  select a.id, a.email, a.last_active
  from activity a
  where a.last_active < now() - make_interval(days => p_days)
    and exists (
      select 1 from consent_status cs
      where cs.contact_id = a.contact_id and cs.purpose in ('rider_alerts', 'rider_news') and cs.action = 'grant'
    );
$$;
revoke all on function public.quiet_riders(integer) from public, anon, authenticated;
