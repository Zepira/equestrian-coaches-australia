-- "Build · Prove the value" spec: one append-only event log, written
-- server-side, that can answer "which coach, which rider, when" per event
-- — not GA4, which can't attribute at that granularity. Deliberately
-- shipped ahead of its consumers (same pattern as term_slug_history,
-- 0007 -> 0015): nothing reads/aggregates this table yet beyond the one
-- profile_view call site wired in alongside this migration. Bot filtering,
-- the contact block's reveal-logging, the enquiries table, and the nightly
-- rollup are separate, later cards.
create type public.event_kind as enum (
  'search_performed',
  'result_impression',
  'result_click',
  'profile_view',
  'contact_reveal',
  'enquiry_sent',
  'clinic_view',
  'clinic_enquiry',
  'share_click',
  'referral_signup'
);

create table public.events (
  id             bigserial primary key,
  kind           public.event_kind not null,
  occurred_at    timestamptz not null default now(),
  coach_id       uuid references public.coach_profiles (id) on delete set null,
  area_id        uuid references public.areas (id) on delete set null,
  term_id        uuid references public.terms (id) on delete set null,
  channel        text,
  -- Position within a result list for impressions/clicks — lets a coach
  -- email later say "you appeared in 140 searches, opened 12 times" and
  -- spot coaches being scrolled past rather than just not shown.
  position       int,
  query          text,
  source         text,
  campaign       text,
  referrer_host  text,
  -- Salted DAILY, not monthly (see src/lib/events.ts) — dedupes a same-day
  -- refresh without ever being able to follow one visitor across days.
  session_hash   text,
  device_class   text,
  meta           jsonb not null default '{}'::jsonb
);

create index events_kind_occurred_idx on public.events (kind, occurred_at desc);
create index events_coach_idx on public.events (coach_id) where coach_id is not null;

-- No anon insert policy, deliberately — same reasoning as search_events
-- (0011_search_events.sql): an open insert policy here is a spam/forgery
-- endpoint. Written only from the service-role client, server-side.
alter table public.events enable row level security;
create policy "events admin read" on public.events for select using (public.is_admin());
