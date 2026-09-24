-- CMS build stage 5 (The Site as a CMS §06, §09): sign-up that knows its
-- profession, cohort and source; invites; the review queue's change log; and
-- the record of billing emails sent.

-- ── Sign-up trigger ─────────────────────────────────────────────────────────
-- Changes from the baseline:
--   * cohort is decided here, from the founding_join_by setting, never taken
--     from the sign-up form (a hand-made request could claim "founding"):
--     founding if the setting is empty or today is on or before it.
--   * acquisition_source from metadata ("ref=kim-fb;utm_source=…"), or the
--     invite's own source when the sign-up came through an invite.
--   * an invite token, when valid (unused, unexpired), links the provider to
--     the invite, fills the profile from its prefill, sets the profession,
--     and marks the invite used. An invalid token is ignored, not an error:
--     the account still gets made.
--   * the provider starts as a draft (the default), and a second profession
--     can arrive later from onboarding.
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
begin
  -- 'coach' is accepted from old links and means provider.
  v_role := case when new.raw_user_meta_data ->> 'role' in ('provider', 'coach') then 'provider' else 'rider' end;
  insert into public.profiles (id, role, name, email) values (new.id, v_role, v_name, new.email);

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
      case when v_invite.id is not null then 'invite:' || v_invite.source else v_source end,
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
  end if;
  return new;
end;
$$;

-- ── Recent changes (§06.5) ──────────────────────────────────────────────────
-- Edits to a published profile go live without another review; the ones a
-- reviewer would want to glance at (name, photo) are listed in admin.
create table if not exists public.provider_changes (
  id          bigint generated always as identity primary key,
  provider_id uuid not null references public.providers (id) on delete cascade,
  field       text not null,
  old_value   text,
  new_value   text,
  changed_by  uuid references public.profiles (id) on delete set null,
  changed_at  timestamptz not null default now()
);
create index if not exists provider_changes_recent_idx on public.provider_changes (changed_at desc);
alter table public.provider_changes enable row level security;
drop policy if exists "provider_changes admin read" on public.provider_changes;
create policy "provider_changes admin read" on public.provider_changes for select using (public.is_admin());
drop policy if exists "provider_changes members insert" on public.provider_changes;
create policy "provider_changes members insert" on public.provider_changes for insert
  with check (public.is_provider_member(provider_id));

-- ── Billing emails sent (§09) ───────────────────────────────────────────────
-- One row per email per subscription (the launch-day date email, the 30/14/3
-- day reminders), so the daily job never sends one twice. Service role only.
create table if not exists public.billing_notices (
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  kind            text not null,
  sent_at         timestamptz not null default now(),
  primary key (subscription_id, kind)
);
alter table public.billing_notices enable row level security;

-- ── Invites: admins only (they hold email addresses) ────────────────────────
alter table public.invites enable row level security;
drop policy if exists "invites admin" on public.invites;
create policy "invites admin" on public.invites for all using (public.is_admin()) with check (public.is_admin());

-- ── Review can't be skipped (§06.4) ─────────────────────────────────────────
-- Members may update their own provider row (RLS), which without this would
-- let a request set status = 'published' and skip review, or rewrite its
-- cohort. For any signed-in request that isn't an admin, the review and
-- lifecycle fields keep their old values; the app changes them through the
-- service role (auth.uid() is null there), after its own checks.
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
  end if;
  return new;
end;
$$;
drop trigger if exists providers_protect_review_fields on public.providers;
create trigger providers_protect_review_fields before update on public.providers
  for each row execute function public.providers_protect_review_fields();
