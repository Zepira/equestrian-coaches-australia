-- Phase 9: taxonomy build spec ("How Riders Find Us"). One `terms` table
-- with a `kind` (discipline/skill/attribute) instead of three parallel
-- tables — otherwise the alias layer, admin UI and search filter get
-- built three times and drift. Disciplines keep their special status:
-- they're the only kind that generates pages (to start with) and the
-- only kind a rider picks first.

create type public.term_kind as enum ('discipline', 'skill', 'attribute');

create table public.terms (
  id              uuid primary key default gen_random_uuid(),
  kind            public.term_kind not null,
  slug            text not null,
  name            text not null,
  blurb           text not null default '',
  -- only disciplines start true; admin promotes a skill/attribute once
  -- the search reports prove riders search it with a location attached
  generates_pages boolean not null default false,
  active          boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (kind, slug)
);

create table public.term_aliases (
  id         uuid primary key default gen_random_uuid(),
  term_id    uuid not null references public.terms (id) on delete cascade,
  alias      text not null,
  -- one alias is marked primary per term, used deterministically in
  -- generated page titles rather than picking one at random
  is_primary boolean not null default false,
  -- seed | admin | search_console | onsite
  source     text not null default 'seed',
  created_at timestamptz not null default now()
);

-- an alias belongs to exactly one term, or matching becomes ambiguous
create unique index term_aliases_lower_uniq on public.term_aliases (lower(alias));

create table public.coach_terms (
  coach_id   uuid not null references public.coach_profiles (id) on delete cascade,
  term_id    uuid not null references public.terms (id) on delete cascade,
  -- lowest-ordered discipline is the coach's primary, used in page titles
  sort_order int not null default 0,
  primary key (coach_id, term_id)
);

-- which skills/attributes to offer when a coach picks a discipline
create table public.term_suggestions (
  discipline_id uuid not null references public.terms (id) on delete cascade,
  term_id       uuid not null references public.terms (id) on delete cascade,
  sort_order    int not null default 0,
  primary key (discipline_id, term_id)
);

-- renaming a slug breaks a live URL once generates_pages is true, so
-- keep the old one and 301 it rather than silently 404ing indexed pages
create table public.term_slug_history (
  kind       public.term_kind not null,
  old_slug   text not null,
  term_id    uuid not null references public.terms (id) on delete cascade,
  changed_at timestamptz not null default now(),
  primary key (kind, old_slug)
);

-- ── admin access ─────────────────────────────────────────────────────────
-- user_role stays ('rider','coach') set by the signup trigger — adding
-- 'admin' would mean touching the trigger/signup flow and would stop an
-- admin also being a coach. A separate table is cleaner.
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ── RLS: terms/aliases/suggestions/slug-history — readable by all
--    (active rows), writable by admin only ────────────────────────────────
alter table public.terms enable row level security;
create policy "terms readable" on public.terms
  for select using (active = true or public.is_admin());
create policy "terms admin write" on public.terms
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.term_aliases enable row level security;
create policy "term_aliases readable" on public.term_aliases
  for select using (true);
create policy "term_aliases admin write" on public.term_aliases
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.term_suggestions enable row level security;
create policy "term_suggestions readable" on public.term_suggestions
  for select using (true);
create policy "term_suggestions admin write" on public.term_suggestions
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.term_slug_history enable row level security;
create policy "term_slug_history admin only" on public.term_slug_history
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.admin_users enable row level security;
create policy "admin_users admin only" on public.admin_users
  for all using (public.is_admin()) with check (public.is_admin());

-- coach_terms follows the same shape as the old coach_disciplines: viewable
-- by everyone, writable only by the coach it belongs to.
alter table public.coach_terms enable row level security;
create policy "coach_terms viewable by everyone" on public.coach_terms
  for select using (true);
create policy "coaches manage their own terms" on public.coach_terms
  for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);
