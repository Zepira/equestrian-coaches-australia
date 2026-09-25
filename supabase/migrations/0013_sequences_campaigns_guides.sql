-- The Marketing Engine stage D: M7 sequences, M8 campaigns, M9 guides.
-- Every table here is written by server code with the service role; RLS is
-- admin only except where noted (published guides are public).

-- ── email_events: what happened to each email ─────────────────────────────
-- From Resend's webhooks (delivered, bounced, complained) and our own click
-- redirect (clicked). Plain-text emails can't be opened-tracked, so there
-- are no opens. Serves campaigns, sequences and anything else sent.
create table if not exists public.email_events (
  id              uuid primary key default gen_random_uuid(),
  resend_id       text,
  contact_id      uuid references public.contacts (id) on delete cascade,
  campaign_id     uuid,
  sequence_run_id uuid,
  type            text not null check (type in ('delivered', 'bounced', 'complained', 'clicked')),
  link            text,
  created_at      timestamptz not null default now()
);
create index if not exists email_events_resend on public.email_events (resend_id);
create index if not exists email_events_campaign on public.email_events (campaign_id, type);
create index if not exists email_events_contact on public.email_events (contact_id, type, created_at desc);
alter table public.email_events enable row level security;
drop policy if exists "email events admin" on public.email_events;
create policy "email events admin" on public.email_events for all using (public.is_admin()) with check (public.is_admin());

-- ── M7 sequences ─────────────────────────────────────────────────────────
-- Triggers and exit rules are code (src/lib/sequences.ts); the words (one
-- content block per step), the delays and the switches are admin.
create table if not exists public.sequences (
  key         text primary key,
  active      boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);
create table if not exists public.sequence_steps (
  sequence_key text not null references public.sequences (key) on delete cascade,
  position     smallint not null,
  -- Hours after the previous step (or after the trigger, for the first).
  delay_hours  integer not null check (delay_hours between 0 and 2160),
  active       boolean not null default true,
  primary key (sequence_key, position)
);
create table if not exists public.sequence_runs (
  id           uuid primary key default gen_random_uuid(),
  sequence_key text not null references public.sequences (key) on delete cascade,
  -- Who it's about: a provider id or a profile id. Each starts once per subject.
  subject_id   uuid not null,
  contact_id   uuid references public.contacts (id) on delete cascade,
  step_reached smallint not null default 0,
  next_at      timestamptz,
  started_at   timestamptz not null default now(),
  stopped_at   timestamptz,
  stop_reason  text,
  stop_token   text not null unique default encode(gen_random_bytes(18), 'hex'),
  unique (sequence_key, subject_id)
);
-- Each step as it went: the record of what we sent, and Resend's id for its events.
create table if not exists public.sequence_sends (
  run_id    uuid not null references public.sequence_runs (id) on delete cascade,
  position  smallint not null,
  result    text not null,
  resend_id text,
  sent_at   timestamptz not null default now(),
  primary key (run_id, position)
);
create index if not exists sequence_sends_resend on public.sequence_sends (resend_id);
alter table public.sequence_sends enable row level security;
drop policy if exists "sequence sends admin" on public.sequence_sends;
create policy "sequence sends admin" on public.sequence_sends for all using (public.is_admin()) with check (public.is_admin());
create index if not exists sequence_runs_due on public.sequence_runs (next_at) where stopped_at is null;
alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.sequence_runs enable row level security;
drop policy if exists "sequences admin" on public.sequences;
create policy "sequences admin" on public.sequences for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "sequence steps admin" on public.sequence_steps;
create policy "sequence steps admin" on public.sequence_steps for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "sequence runs admin" on public.sequence_runs;
create policy "sequence runs admin" on public.sequence_runs for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists sequences_change_log on public.sequences;
create trigger sequences_change_log after insert or update or delete on public.sequences for each row execute function public.record_change();
drop trigger if exists sequence_steps_change_log on public.sequence_steps;
create trigger sequence_steps_change_log after insert or update or delete on public.sequence_steps for each row execute function public.record_change();

-- ── M8 campaigns ─────────────────────────────────────────────────────────
create table if not exists public.audiences (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 1 and 80),
  -- Dropdown choices only (AudienceFilter in src/lib/campaigns.ts), never SQL.
  filter     jsonb not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(name) between 1 and 80),
  -- Goes in utm_campaign on every link, so sign-ups can be traced back.
  slug         text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  audience_id  uuid references public.audiences (id) on delete set null,
  -- The filter as it was when sending started.
  filter       jsonb,
  subject      text not null default '',
  preview      text not null default '',
  -- [{type:'text', body}, {type:'button', label, url}, {type:'events'}, {type:'providers'}, {type:'guide', guide_id}]
  sections     jsonb not null default '[]',
  status       text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at timestamptz,
  started_at   timestamptz,
  sent_at      timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create table if not exists public.campaign_sends (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  contact_id  uuid not null references public.contacts (id) on delete cascade,
  email       text not null,
  status      text not null default 'queued' check (status in ('queued', 'sent', 'logged', 'failed', 'skipped')),
  skip_reason text,
  resend_id   text,
  token       text not null unique default encode(gen_random_bytes(18), 'hex'),
  sent_at     timestamptz,
  primary key (campaign_id, contact_id)
);
create index if not exists campaign_sends_queued on public.campaign_sends (campaign_id) where status = 'queued';
alter table public.audiences enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_sends enable row level security;
drop policy if exists "audiences admin" on public.audiences;
create policy "audiences admin" on public.audiences for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "campaigns admin" on public.campaigns;
create policy "campaigns admin" on public.campaigns for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "campaign sends admin" on public.campaign_sends;
create policy "campaign sends admin" on public.campaign_sends for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists audiences_change_log on public.audiences;
create trigger audiences_change_log after insert or update or delete on public.audiences for each row execute function public.record_change();
drop trigger if exists campaigns_change_log on public.campaigns;
create trigger campaigns_change_log after insert or update or delete on public.campaigns for each row execute function public.record_change();

-- Everyone a filter matches, with whether they can be sent to (consent for
-- the purpose, not on the do-not-email list). Service role only.
create or replace function public.audience_members(f jsonb)
returns table (contact_id uuid, email text, name text, profile_id uuid, provider_id uuid, lat double precision, long double precision, sendable boolean)
language sql stable security definer set search_path = public, extensions
as $$
  with params as (
    select
      coalesce(f ->> 'who', 'riders') as who,
      nullif(f ->> 'door', '') as door,
      nullif(f ->> 'profession_id', '')::uuid as profession_id,
      (f ->> 'lat')::double precision as plat,
      (f ->> 'long')::double precision as plong,
      coalesce((f ->> 'km')::integer, 50) as km,
      nullif(f ->> 'tier', '') as tier,
      nullif(f ->> 'cohort', '') as cohort,
      nullif(f ->> 'source', '') as source,
      nullif(f ->> 'joined_from', '')::date as joined_from,
      nullif(f ->> 'joined_to', '')::date as joined_to,
      nullif(f ->> 'clicked_days', '')::integer as clicked_days
  ),
  riders as (
    select c.id as contact_id, c.email, p.name, p.id as profile_id, null::uuid as provider_id,
      (select st_y(ra.location::geometry) from rider_alerts ra where ra.rider_id = p.id and ra.location is not null and ra.provider_id is null order by ra.created_at limit 1) as lat,
      (select st_x(ra.location::geometry) from rider_alerts ra where ra.rider_id = p.id and ra.location is not null and ra.provider_id is null order by ra.created_at limit 1) as long,
      'rider_news'::text as purpose
    from profiles p join contacts c on c.profile_id = p.id, params x
    where x.who = 'riders' and p.role = 'rider'
      and (x.door is null or exists (select 1 from rider_alerts ra where ra.rider_id = p.id and (ra.door::text = x.door or ra.door is null) and ra.unsubscribed_at is null))
      and (x.profession_id is null or exists (select 1 from rider_alerts ra where ra.rider_id = p.id and x.profession_id = any (ra.profession_ids) and ra.unsubscribed_at is null))
      and (x.plat is null or exists (select 1 from rider_alerts ra where ra.rider_id = p.id and ra.location is not null
            and st_dwithin(ra.location, st_setsrid(st_makepoint(x.plong, x.plat), 4326)::geography, x.km * 1000)))
      and (x.source is null or c.first_touch ->> 'source' = x.source)
      and (x.joined_from is null or p.created_at >= x.joined_from)
      and (x.joined_to is null or p.created_at < x.joined_to + 1)
      and (x.clicked_days is null or exists (select 1 from email_events e where e.contact_id = c.id and e.type = 'clicked' and e.created_at > now() - make_interval(days => x.clicked_days)))
  ),
  pros as (
    select distinct on (c.id) c.id as contact_id, c.email, pf.name, pf.id as profile_id, pr.id as provider_id, pr.lat, pr.long,
      'provider_news'::text as purpose
    from providers pr
    join provider_members m on m.provider_id = pr.id
    join profiles pf on pf.id = m.user_id
    join contacts c on c.profile_id = pf.id, params x
    where x.who = 'providers' and pr.status = 'published'
      and (x.door is null or exists (select 1 from provider_terms pt join terms t on t.id = pt.term_id join profession_details d on d.term_id = t.id where pt.provider_id = pr.id and t.kind = 'profession' and d.door::text = x.door))
      and (x.profession_id is null or exists (select 1 from provider_terms pt where pt.provider_id = pr.id and pt.term_id = x.profession_id))
      and (x.plat is null or (pr.location is not null and st_dwithin(pr.location, st_setsrid(st_makepoint(x.plong, x.plat), 4326)::geography, x.km * 1000)))
      and (x.tier is null or exists (select 1 from subscriptions s where s.provider_id = pr.id and s.tier::text = x.tier and s.status in ('active', 'trialing')))
      and (x.cohort is null or pr.cohort::text = x.cohort)
      and (x.source is null or coalesce(pr.acquisition_source, c.first_touch ->> 'source') = x.source)
      and (x.joined_from is null or pr.created_at >= x.joined_from)
      and (x.joined_to is null or pr.created_at < x.joined_to + 1)
      and (x.clicked_days is null or exists (select 1 from email_events e where e.contact_id = c.id and e.type = 'clicked' and e.created_at > now() - make_interval(days => x.clicked_days)))
    order by c.id
  ),
  everyone as (select * from riders union all select * from pros)
  select e.contact_id, e.email, e.name, e.profile_id, e.provider_id, e.lat, e.long,
    exists (select 1 from consent_status cs where cs.contact_id = e.contact_id and cs.purpose = e.purpose and cs.action = 'grant')
      and not exists (select 1 from suppressions s where s.email = lower(e.email)) as sendable
  from everyone e;
$$;
revoke all on function public.audience_members(jsonb) from public, anon, authenticated;

-- ── M9 guides ────────────────────────────────────────────────────────────
create table if not exists public.guides (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title                text not null check (length(title) between 1 and 120),
  summary              text not null default '',
  body                 text not null default '',
  hero_path            text,
  hero_alt             text not null default '',
  hero_credit          text not null default '',
  profession_id        uuid references public.terms (id) on delete set null,
  area_id              uuid references public.areas (id) on delete set null,
  author_name          text not null default '',
  coauthor_provider_id uuid references public.providers (id) on delete set null,
  status               text not null default 'draft' check (status in ('draft', 'published')),
  published_at         timestamptz,
  seo_title            text not null default '',
  seo_description      text not null default '',
  -- A PDF emailed to whoever asks for it on the guide (the lead magnet).
  download_path        text,
  download_title       text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create table if not exists public.guide_terms (
  guide_id uuid not null references public.guides (id) on delete cascade,
  term_id  uuid not null references public.terms (id) on delete cascade,
  primary key (guide_id, term_id)
);
create index if not exists guides_published on public.guides (published_at desc) where status = 'published';
alter table public.guides enable row level security;
alter table public.guide_terms enable row level security;
drop policy if exists "guides public read" on public.guides;
create policy "guides public read" on public.guides for select using (status = 'published' or public.is_admin());
drop policy if exists "guides admin write" on public.guides;
create policy "guides admin write" on public.guides for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "guide terms public read" on public.guide_terms;
create policy "guide terms public read" on public.guide_terms for select using (true);
drop policy if exists "guide terms admin write" on public.guide_terms;
create policy "guide terms admin write" on public.guide_terms for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists guides_change_log on public.guides;
create trigger guides_change_log after insert or update or delete on public.guides for each row execute function public.record_change();

-- Who asked for a guide's download: the record of what we sent and why.
create table if not exists public.guide_downloads (
  id         uuid primary key default gen_random_uuid(),
  guide_id   uuid not null references public.guides (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.guide_downloads enable row level security;
drop policy if exists "guide downloads admin" on public.guide_downloads;
create policy "guide downloads admin" on public.guide_downloads for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public) values ('guide-files', 'guide-files', true) on conflict (id) do nothing;
