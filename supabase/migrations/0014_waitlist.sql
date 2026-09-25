-- The coming soon page's waitlist (see docs/launch.md).
--
-- Nobody can read this table but an admin, and nothing can write to it but the
-- service role: there is no anon or authenticated policy at all, so the only
-- way in is the server route at /api/waitlist. An open insert policy here
-- would be a spam endpoint with an email column.

-- What they said they are. "coach" and "horse_care" are both providers; the
-- distinction is kept because it is the question the form actually asked, and
-- because it is the useful cut when Kim starts working the list.
do $$ begin
  create type public.waitlist_role as enum ('rider', 'coach', 'horse_care');
exception when duplicate_object then null; end $$;

create table if not exists public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  role          public.waitlist_role not null,
  -- Which profession, for a horse care professional who named one, and the
  -- coaches row for a coach. Null when they did not say.
  profession_id uuid references public.terms (id) on delete set null,
  -- Consent to be emailed at launch (Spam Act 2003: consent, sender identity
  -- and a working unsubscribe). The route refuses a sign-up without it, so in
  -- practice this is always true; it is stored because consent you cannot
  -- evidence is not consent.
  consented     boolean not null default false,
  consented_at  timestamptz,
  -- Where the sign-up came from, for when there is more than one form.
  source        text not null default 'coming-soon',
  -- A salted hash of the caller's IP, never the address itself: enough to rate
  -- limit a flood, not enough to be a record of who visited.
  ip_hash       text,
  -- Unguessable, only ever in the email. Same shape as rider_alerts'.
  unsubscribe_token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  unsubscribed_at timestamptz,
  created_at    timestamptz not null default now(),
  constraint waitlist_consent_has_a_date check (consented = false or consented_at is not null)
);

-- One row per person however they type their address. No citext extension in
-- this database, so the index does the lower-casing, the same way term_aliases
-- has always done it.
create unique index if not exists waitlist_email_key on public.waitlist (lower(email));
create index if not exists waitlist_created_idx on public.waitlist (created_at desc);
-- Reads for the rate limit: recent sign-ups from one address.
create index if not exists waitlist_ip_idx on public.waitlist (ip_hash, created_at desc);

alter table public.waitlist enable row level security;
drop policy if exists "waitlist admin read" on public.waitlist;
create policy "waitlist admin read" on public.waitlist for select using (public.is_admin());

comment on table public.waitlist is
  'Coming soon page sign-ups. Admin-readable, service-role writable, no public access.';
