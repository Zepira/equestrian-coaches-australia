-- The Marketing Engine, stage B (content/handbook/marketing-engine.html §06
-- M4 and M6): the follow link, the share kit's tracked links, referrals,
-- promo codes, and a record of one-off sends (the launch email).

-- ── M4: follow one professional's events ─────────────────────────────────────
-- "Get my clinic dates by email": an alert for one provider's events, with no
-- place or distance. The matching functions below treat it on its own.
alter table public.rider_alerts add column if not exists provider_id uuid references public.providers (id) on delete cascade;
create index if not exists rider_alerts_provider_idx on public.rider_alerts (provider_id) where provider_id is not null;

create or replace function public.riders_for_event(p_event_id uuid, p_reach_km int default null)
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
    and (
      ra.provider_id = e.provider_id
      or (
        ra.provider_id is null
        and (cardinality(ra.profession_ids) = 0 or e.profession_id = any(ra.profession_ids))
        and (cardinality(ra.term_ids) = 0 or e.term_id = any(ra.term_ids))
        and (ra.door is null or pd.door is null or ra.door = pd.door)
        and ra.location is not null
        and coalesce(e.location, p.location) is not null
        and st_dwithin(ra.location, coalesce(e.location, p.location), greatest(ra.radius_km, coalesce(p_reach_km, 0)) * 1000)
      )
    )
  -- A follow alert first, so the email says they asked for this person.
  order by ra.rider_id, (ra.provider_id is null), ra.created_at;
$$;

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
  join public.rider_alerts ra on ra.wants_new_providers and ra.unsubscribed_at is null and ra.location is not null and ra.provider_id is null
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

create or replace function public.events_for_rider(p_rider_id uuid, p_within_days int default null)
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
    and (
      ra.provider_id = e.provider_id
      or (
        ra.provider_id is null
        and (cardinality(ra.profession_ids) = 0 or e.profession_id = any(ra.profession_ids))
        and (cardinality(ra.term_ids) = 0 or e.term_id = any(ra.term_ids))
        and (ra.door is null or pd.door is null or ra.door = pd.door)
        and ra.location is not null and coalesce(e.location, p.location) is not null
        and st_dwithin(ra.location, coalesce(e.location, p.location), ra.radius_km * 1000)
      )
    )
  order by e.start_date, e.id
  limit 10;
$$;

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
  where ra.rider_id = p_rider_id and ra.unsubscribed_at is null and ra.wants_new_providers and ra.location is not null and ra.provider_id is null
    and (cardinality(ra.profession_ids) = 0 or exists (
      select 1 from public.provider_terms pt where pt.provider_id = p.id and pt.term_id = any(ra.profession_ids)))
    and (cardinality(ra.term_ids) = 0 or exists (
      select 1 from public.provider_terms pt where pt.provider_id = p.id and pt.term_id = any(ra.term_ids)))
    and (ra.door is null or ra.door = pd.door)
    and st_dwithin(ra.location, p.location, greatest(ra.radius_km, coalesce(p.travel_radius_km, 0)) * 1000)
  order by p.id
  limit 12;
$$;

-- ── M4: the share kit's links belong to a provider ───────────────────────────
-- Each piece (share image, poster, badge, signature, follow link) is a /go/
-- link of the provider's own, so their dashboard shows what each one brought.
alter table public.links add column if not exists provider_id uuid references public.providers (id) on delete cascade;
alter table public.links add column if not exists kind text;
create unique index if not exists links_provider_kind_uniq on public.links (provider_id, kind) where provider_id is not null;
-- Members read their own links' clicks.
drop policy if exists "link_clicks member read" on public.link_clicks;
create policy "link_clicks member read" on public.link_clicks for select using (
  exists (select 1 from public.links l where l.id = link_id and l.provider_id is not null and public.is_provider_member(l.provider_id))
);

-- ── M6: referrals ────────────────────────────────────────────────────────────
alter table public.providers add column if not exists referral_code text unique;
alter table public.providers add column if not exists promo_code text;
update public.providers set referral_code = upper(substr(regexp_replace(slug, '[^a-z]', '', 'g'), 1, 5) || substr(replace(id::text, '-', ''), 1, 4))
where referral_code is null or referral_code <> upper(referral_code);

create table if not exists public.referrals (
  id                   uuid primary key default gen_random_uuid(),
  referrer_provider_id uuid not null references public.providers (id) on delete cascade,
  referee_provider_id  uuid not null unique references public.providers (id) on delete cascade,
  code                 text not null,
  -- joined: signed up with the code; paid: their first payment went through;
  -- rewarded: the referrer's month was credited; capped: over the yearly limit.
  status               text not null default 'joined' check (status in ('joined', 'paid', 'rewarded', 'capped')),
  referee_coupon       text,
  rewarded_at          timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_provider_id);
alter table public.referrals enable row level security;
drop policy if exists "referrals member read" on public.referrals;
create policy "referrals member read" on public.referrals for select using (public.is_provider_member(referrer_provider_id) or public.is_admin());

-- ── M6: promo codes (Stripe is the authority for what a code does) ───────────
create table if not exists public.promo_codes (
  id                       uuid primary key default gen_random_uuid(),
  code                     text not null unique check (code ~ '^[A-Z0-9]{3,24}$'),
  description              text not null,
  percent_off              int not null check (percent_off between 1 and 100),
  duration_months          int not null check (duration_months between 1 and 24),
  max_redemptions          int check (max_redemptions is null or max_redemptions > 0),
  expires_on               date,
  first_time_only          boolean not null default true,
  active                   boolean not null default true,
  stripe_coupon_id         text,
  stripe_promotion_code_id text,
  created_by               uuid references public.profiles (id) on delete set null,
  created_at               timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
drop policy if exists "promo_codes admin" on public.promo_codes;
create policy "promo_codes admin" on public.promo_codes for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists promo_codes_change_log on public.promo_codes;
create trigger promo_codes_change_log after insert or update or delete on public.promo_codes
  for each row execute function public.record_change();

create table if not exists public.promo_redemptions (
  promo_id    uuid not null references public.promo_codes (id) on delete cascade,
  provider_id uuid not null references public.providers (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (promo_id, provider_id)
);
alter table public.promo_redemptions enable row level security;
drop policy if exists "promo_redemptions admin read" on public.promo_redemptions;
create policy "promo_redemptions admin read" on public.promo_redemptions for select using (public.is_admin());

-- ── One-off sends (the launch email; campaigns later) ───────────────────────
create table if not exists public.email_sends (
  contact_id uuid not null references public.contacts (id) on delete cascade,
  key        text not null,
  result     text not null,
  sent_at    timestamptz not null default now(),
  primary key (contact_id, key)
);
alter table public.email_sends enable row level security;
drop policy if exists "email_sends admin read" on public.email_sends;
create policy "email_sends admin read" on public.email_sends for select using (public.is_admin());

-- ── Sign-up: referral and promo codes ────────────────────────────────────────
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
  v_referrer    uuid;
  v_code        text;
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

    -- Every professional gets a referral code of their own (M6).
    v_code := upper(substr(regexp_replace(v_slug, '[^a-z]', '', 'g'), 1, 5) || substr(replace(new.id::text, '-', ''), 1, 4));
    update public.providers set referral_code = v_code where id = v_provider_id;

    -- Joined through a colleague's link: record it, unless it's their own
    -- code or the referrer shares their email address.
    select p.id into v_referrer from public.providers p
    where p.referral_code = upper(nullif(new.raw_user_meta_data ->> 'referral', ''))
      and p.id <> v_provider_id
      and not exists (
        select 1 from public.provider_members m join public.profiles pr on pr.id = m.user_id
        where m.provider_id = p.id and lower(pr.email) = lower(new.email)
      );
    if v_referrer is not null then
      insert into public.referrals (referrer_provider_id, referee_provider_id, code)
      values (v_referrer, v_provider_id, upper(new.raw_user_meta_data ->> 'referral'))
      on conflict (referee_provider_id) do nothing;
    end if;

    -- A promo code a link carried, used at checkout (M6).
    update public.providers set promo_code = upper(nullif(new.raw_user_meta_data ->> 'promo', ''))
    where id = v_provider_id and exists (select 1 from public.promo_codes c where c.code = upper(new.raw_user_meta_data ->> 'promo') and c.active);

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
