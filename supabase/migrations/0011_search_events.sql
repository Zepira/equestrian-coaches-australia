-- Phase 9: every rider search, ours not Google's — the best gap signal
-- we own. Zero-result rows split into supply gaps (recruiting targets)
-- vs vocabulary gaps (feed the alias pipeline).
create table public.search_events (
  id               bigserial primary key,
  q                text,
  term_ids         uuid[] not null default '{}',
  location_text    text,
  lat              double precision,
  lng              double precision,
  radius_km        int,
  result_count     int not null,
  clicked_coach_id uuid references public.coach_profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index search_events_zero on public.search_events (created_at desc)
  where result_count = 0;

-- No anon insert policy, deliberately — an open insert policy here is a
-- spam endpoint. Written from the search server action using the
-- service-role client instead. RLS stays default-deny for every role.
alter table public.search_events enable row level security;
create policy "search_events admin read" on public.search_events
  for select using (public.is_admin());
