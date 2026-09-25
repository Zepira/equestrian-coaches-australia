-- The Marketing Engine, stage A (content/handbook/marketing-engine.html §05,
-- §06 M1 to M3 and the fixes list): the audience and its consent record,
-- tracked links, on-site capture, and the pre-launch fixes.

-- ── M1: contacts ────────────────────────────────────────────────────────────
-- One row per email address, whoever it belongs to: a rider, a professional,
-- someone who asked for alerts without an account. Linked to a profile when
-- there is one. `token` opens their email preferences without a login.
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  profile_id  uuid references public.profiles (id) on delete set null,
  token       text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  -- Where they first and most recently came from (M2): {source, medium, campaign, link, at}.
  first_touch jsonb,
  last_touch  jsonb,
  created_at  timestamptz not null default now()
);
create unique index if not exists contacts_email_uniq on public.contacts (lower(email));
create index if not exists contacts_profile_idx on public.contacts (profile_id);
alter table public.contacts enable row level security;
drop policy if exists "contacts admin read" on public.contacts;
create policy "contacts admin read" on public.contacts for select using (public.is_admin());

-- ── M1: consent wordings ────────────────────────────────────────────────────
-- The exact words of every consent checkbox and label, by version. Forms read
-- the newest version; a consent row points at the one the person saw.
create table if not exists public.consent_wordings (
  id         uuid primary key default gen_random_uuid(),
  purpose    text not null check (purpose in ('rider_alerts', 'rider_news', 'provider_news', 'waitlist', 'invite')),
  version    int not null,
  body       text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (purpose, version)
);
alter table public.consent_wordings enable row level security;
drop policy if exists "consent_wordings readable" on public.consent_wordings;
create policy "consent_wordings readable" on public.consent_wordings for select using (true);
drop policy if exists "consent_wordings admin insert" on public.consent_wordings;
create policy "consent_wordings admin insert" on public.consent_wordings for insert with check (public.is_admin());

-- ── M1: consents, append-only ───────────────────────────────────────────────
-- Under the Spam Act the sender proves consent, so every grant and every
-- withdrawal is a row, and rows are never changed or removed. A person's
-- status for a purpose is their newest row for it.
create table if not exists public.consents (
  id          bigint generated always as identity primary key,
  contact_id  uuid not null references public.contacts (id) on delete cascade,
  channel     text not null default 'email' check (channel in ('email')),
  purpose     text not null check (purpose in ('rider_alerts', 'rider_news', 'provider_news', 'waitlist', 'invite')),
  action      text not null check (action in ('grant', 'withdraw')),
  -- For a grant: they ticked a box (express), they're a paying customer
  -- (existing_customer), or their business address was published (published_address).
  type        text check (type in ('express', 'existing_customer', 'published_address')),
  wording_id  uuid references public.consent_wordings (id),
  -- Where: the form, the invite, the preferences page, a bounce, an admin.
  source      text not null,
  -- For a withdrawal: link, one_click, preferences, account, admin, bounce, complaint.
  method      text,
  ip          text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  check (action = 'withdraw' or type is not null)
);
create index if not exists consents_contact_idx on public.consents (contact_id, purpose, created_at desc);
alter table public.consents enable row level security;
drop policy if exists "consents admin read" on public.consents;
create policy "consents admin read" on public.consents for select using (public.is_admin());

create or replace function public.consents_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'consents are append-only: add a withdraw row instead';
end;
$$;
drop trigger if exists consents_append_only on public.consents;
create trigger consents_append_only before update or delete on public.consents
  for each row when (pg_trigger_depth() = 0) execute function public.consents_append_only();
-- (A contact deleted on request cascades its consents away; that path runs
-- as a foreign-key action, which the depth check lets through.)

-- A contact's current status per purpose.
create or replace view public.consent_status as
select distinct on (contact_id, purpose) contact_id, purpose, action, type, created_at
from public.consents
order by contact_id, purpose, created_at desc, id desc;
-- A view runs as its owner unless told otherwise, which would skip the
-- consents policy; this makes it ask as the caller.
alter view public.consent_status set (security_invoker = on);

-- ── M1: suppressions ────────────────────────────────────────────────────────
-- One list every send checks. A bounce stops everything; an unsubscribe from
-- everything, a spam complaint or an admin block stops every commercial email.
create table if not exists public.suppressions (
  email      text not null,
  reason     text not null check (reason in ('bounce', 'complaint', 'unsubscribe_all', 'admin')),
  detail     text,
  created_at timestamptz not null default now(),
  primary key (email, reason)
);
create index if not exists suppressions_email_idx on public.suppressions (lower(email));
alter table public.suppressions enable row level security;
drop policy if exists "suppressions admin read" on public.suppressions;
create policy "suppressions admin read" on public.suppressions for select using (public.is_admin());

-- ── M3: alerts asked for without an account ─────────────────────────────────
-- "Tell me when a farrier starts near Kyneton" from someone not signed in: the
-- alert waits here until they click the link we email, which proves the
-- address is theirs. Confirming makes them a rider account with the alert.
create table if not exists public.pending_alerts (
  token        text primary key default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  email        text not null,
  alert        jsonb not null,
  news         boolean not null default false,
  wording_ids  uuid[] not null default '{}',
  source       text not null,
  ip           text,
  touch        jsonb,
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz
);
alter table public.pending_alerts enable row level security;

-- ── M2: tracked links ───────────────────────────────────────────────────────
create table if not exists public.links (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  label        text not null,
  destination  text not null default '/' check (destination ~ '^/'),
  utm_source   text not null,
  utm_medium   text not null default 'link',
  utm_campaign text not null default '',
  archived     boolean not null default false,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
alter table public.links enable row level security;
drop policy if exists "links readable" on public.links;
create policy "links readable" on public.links for select using (true);
drop policy if exists "links admin write" on public.links;
create policy "links admin write" on public.links for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists links_change_log on public.links;
create trigger links_change_log after insert or update or delete on public.links
  for each row execute function public.record_change();

create table if not exists public.link_clicks (
  link_id      uuid not null references public.links (id) on delete cascade,
  visitor_hash text not null,
  day          date not null default current_date,
  created_at   timestamptz not null default now(),
  primary key (link_id, visitor_hash, day)
);
alter table public.link_clicks enable row level security;
drop policy if exists "link_clicks admin read" on public.link_clicks;
create policy "link_clicks admin read" on public.link_clicks for select using (public.is_admin());

-- ── M3: landing pages ───────────────────────────────────────────────────────
create table if not exists public.landing_pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  name         text not null,
  eyebrow      text not null default '',
  title        text not null,
  body         text not null default '',
  button_label text not null default '',
  button_href  text not null default '',
  show_alerts  boolean not null default true,
  published    boolean not null default false,
  updated_at   timestamptz not null default now()
);
alter table public.landing_pages enable row level security;
drop policy if exists "landing_pages readable" on public.landing_pages;
create policy "landing_pages readable" on public.landing_pages for select using (published or public.is_admin());
drop policy if exists "landing_pages admin write" on public.landing_pages;
create policy "landing_pages admin write" on public.landing_pages for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists landing_pages_change_log on public.landing_pages;
create trigger landing_pages_change_log after insert or update or delete on public.landing_pages
  for each row execute function public.record_change();

-- ── Invites: where the address came from (§05.5) ────────────────────────────
alter table public.invites add column if not exists address_source_url text;
alter table public.invites add column if not exists address_found_on date;

-- ── Fixes: protected titles (§05.12) ────────────────────────────────────────
-- Words a profession's people may only use once their registration has been
-- checked against the public register ("physiotherapist", "specialist").
alter table public.profession_details add column if not exists protected_titles text[] not null default '{}';
alter table public.providers add column if not exists registration_number text not null default '';
alter table public.providers add column if not exists registration_checked_at timestamptz;
alter table public.providers add column if not exists registration_checked_by uuid references public.profiles (id) on delete set null;
alter table public.providers add column if not exists specialist_checked boolean not null default false;

-- Members can't mark their own registration checked.
create or replace function public.providers_protect_review_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.status := old.status;
    new.submitted_at := old.submitted_at;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.review_note := old.review_note;
    new.published_at := old.published_at;
    new.cohort := old.cohort;
    new.acquisition_source := old.acquisition_source;
    new.invite_id := old.invite_id;
    new.hidden_by_admin := old.hidden_by_admin;
    new.specialist_checked := old.specialist_checked;
    new.registration_checked_by := old.registration_checked_by;
    -- A changed number is no longer the one that was checked.
    if new.registration_number is distinct from old.registration_number then
      new.registration_checked_at := null;
      new.specialist_checked := false;
    else
      new.registration_checked_at := old.registration_checked_at;
    end if;
  end if;
  return new;
end;
$$;

-- The two professions whose usual titles are protected get names that aren't.
update public.terms set name = 'Equine physiotherapy', updated_at = now() where kind = 'profession' and slug = 'physiotherapists';
update public.profession_details d set
  singular = 'physiotherapy practitioner', plural = 'physiotherapy practitioners', short_name = 'Physiotherapy',
  job_title = 'Equine physiotherapy practitioner', protected_titles = '{physiotherapist,physiotherapists,physio,physios}'
from public.terms t where t.id = d.term_id and t.slug = 'physiotherapists';
update public.terms set name = 'Equine chiropractic', updated_at = now() where kind = 'profession' and slug = 'chiropractors';
update public.profession_details d set
  singular = 'chiropractic practitioner', plural = 'chiropractic practitioners', short_name = 'Chiropractic',
  job_title = 'Equine chiropractic practitioner', protected_titles = '{chiropractor,chiropractors,chiro,chiros}'
from public.terms t where t.id = d.term_id and t.slug = 'chiropractors';
update public.profession_details d set protected_titles = '{specialist}'
from public.terms t where t.id = d.term_id and t.slug = 'vets';

-- ── Fixes: yearly renewal reminders (§05.9) ─────────────────────────────────
alter table public.subscriptions add column if not exists billing_interval text check (billing_interval in ('month', 'year'));

-- ── Reserved words: the new top-level routes ────────────────────────────────
alter table public.terms drop constraint if exists terms_profession_slug_not_reserved;
alter table public.terms add constraint terms_profession_slug_not_reserved check (
  kind <> 'profession' or slug not in (
    'about', 'account', 'admin', 'api', 'auth', 'clinics', 'dashboard', 'disciplines', 'events',
    'for-coaches', 'for-professionals', 'forgot-password', 'horse-care', 'icon.png', 'apple-icon.png', 'join',
    'list-your-business', 'login', 'profile', 'reset-password', 'riding-instructors', 'robots.txt', 'search',
    'signup', 'sitemap.xml', 'brand', 'hero', 'vendor', '_next', 'onboarding', 'unsubscribe', 'terms', 'privacy',
    'go', 'p', 'email-preferences', 'alerts', 'how-we-list', 'guides'
  )
);

-- ── Wordings, version 1 ─────────────────────────────────────────────────────
insert into public.consent_wordings (purpose, version, body) values
  ('rider_alerts', 0, 'We''ll email you when something matches, plus one round-up a month. Every email has a link to stop it in one click.'),
  ('rider_news', 0, 'We''ll email you when something matches, plus one round-up a month. Every email has a link to stop it in one click.'),
  ('rider_alerts', 1, 'Email me when something matches this alert. Every email has a link to stop it in one click.'),
  ('rider_news', 1, 'Also send me a monthly round-up of events and new people near me.'),
  ('provider_news', 1, 'Email me my monthly numbers, and now and then news for professionals. I can stop these any time.'),
  ('invite', 1, 'Their business email address was published, with nothing saying they don''t want marketing, and the message is about their work.')
on conflict (purpose, version) do nothing;

-- ── Sign-up: the contact, where they came from, and what they agreed to ──────
-- Adds to stage 5's trigger: every new account gets its contact row (or joins
-- the one an earlier alert made), the first and last touch from the site's
-- cookies, and a provider_news consent when the sign-up box was ticked
-- (metadata news_wording: the wording id the form showed).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role        public.user_role;
  v_name        text := coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1));
  v_base        text;
  v_slug        text;
  v_provider_id uuid;
  v_profession  uuid;
  v_join_by     text;
  v_cohort      text;
  v_source      text := nullif(new.raw_user_meta_data ->> 'source', '');
  v_invite      public.invites%rowtype;
  v_contact     uuid;
  v_first       jsonb;
  v_last        jsonb;
  v_wording     uuid;
begin
  v_role := case when new.raw_user_meta_data ->> 'role' in ('provider', 'coach') then 'provider' else 'rider' end;
  insert into public.profiles (id, role, name, email) values (new.id, v_role, v_name, new.email);

  begin v_first := nullif((new.raw_user_meta_data ->> 'touch_first')::jsonb, 'null'::jsonb); exception when others then v_first := null; end;
  begin v_last := nullif((new.raw_user_meta_data ->> 'touch_last')::jsonb, 'null'::jsonb); exception when others then v_last := null; end;
  insert into public.contacts (email, profile_id, first_touch, last_touch)
  values (lower(new.email), new.id, v_first, coalesce(v_last, v_first))
  on conflict (lower(email)) do update set
    profile_id = excluded.profile_id,
    first_touch = coalesce(public.contacts.first_touch, excluded.first_touch),
    last_touch = coalesce(excluded.last_touch, public.contacts.last_touch)
  returning id into v_contact;

  if v_role = 'provider' then
    select * into v_invite from public.invites
    where token = nullif(new.raw_user_meta_data ->> 'invite', '')
      and used_at is null and expires_at > now();

    select value into v_join_by from public.settings where key = 'founding_join_by';
    v_cohort := case
      when coalesce(v_join_by, '') = '' then 'founding'
      when current_date <= v_join_by::date then 'founding'
      else 'open'
    end;

    v_base := coalesce(nullif(public.slugify(v_name), ''), 'provider');
    v_slug := v_base;
    if exists (select 1 from public.providers where slug = v_slug) then
      v_slug := v_base || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
    end if;
    insert into public.providers (slug, name, cohort, acquisition_source, invite_id, headline, suburb, state, business_name)
    values (
      v_slug,
      v_name,
      v_cohort,
      case when v_invite.id is not null then 'invite:' || v_invite.source else coalesce(v_source, v_first ->> 'source') end,
      v_invite.id,
      coalesce(v_invite.prefill ->> 'headline', ''),
      coalesce(v_invite.prefill ->> 'suburb', ''),
      coalesce(v_invite.prefill ->> 'state', ''),
      nullif(v_invite.prefill ->> 'business_name', '')
    )
    returning id into v_provider_id;
    insert into public.provider_members (provider_id, user_id, role) values (v_provider_id, new.id, 'owner');

    select t.id into v_profession from public.terms t
    where t.kind = 'profession'
      and (t.id = v_invite.profession_id
        or (v_invite.profession_id is null and t.slug = coalesce(new.raw_user_meta_data ->> 'profession', 'coaches')))
    limit 1;
    if v_profession is not null then
      insert into public.provider_terms (provider_id, term_id, sort_order) values (v_provider_id, v_profession, 0);
    end if;

    if v_invite.id is not null then
      update public.invites set used_at = now(), provider_id = v_provider_id where id = v_invite.id;
    end if;

    -- The unticked-by-default box on the sign-up form.
    begin v_wording := nullif(new.raw_user_meta_data ->> 'news_wording', '')::uuid; exception when others then v_wording := null; end;
    if v_wording is not null and exists (select 1 from public.consent_wordings where id = v_wording and purpose = 'provider_news') then
      insert into public.consents (contact_id, purpose, action, type, wording_id, source)
      values (v_contact, 'provider_news', 'grant', 'express', v_wording, 'signup');
    end if;
  end if;
  return new;
end;
$$;

-- ── Backfill: everyone who exists today ─────────────────────────────────────
insert into public.contacts (email, profile_id, created_at)
select lower(p.email), p.id, p.created_at from public.profiles p where p.email is not null
on conflict (lower(email)) do update set profile_id = excluded.profile_id;

-- Riders' existing alerts were agreed to under the old sentence (version 0).
insert into public.consents (contact_id, purpose, action, type, wording_id, source, created_at)
select c.id, x.purpose, 'grant', 'express', w.id, 'backfill:' || ra.consent_source, min(ra.consented_at)
from public.rider_alerts ra
join public.contacts c on c.profile_id = ra.rider_id
cross join (values ('rider_alerts'), ('rider_news')) as x (purpose)
join public.consent_wordings w on w.purpose = x.purpose and w.version = 0
where ra.unsubscribed_at is null
  and not exists (select 1 from public.consents k where k.contact_id = c.id and k.purpose = x.purpose)
group by c.id, x.purpose, w.id, ra.consent_source;
