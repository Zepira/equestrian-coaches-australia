-- Stage 8 of the CMS rebuild: the admin (The Site as a CMS §10).
--
-- 1. change_log: one history table for every admin-edited row that isn't a
--    setting or a content block (those have their own). A trigger writes it,
--    so no code path can change a profession, a term, an alias or an area
--    intro without a row here saying who and when.
-- 2. area_intros: the hand-written intro for an area page, per profession.
-- 3. providers.hidden_by_admin: an admin hide that billing can't undo.

create table if not exists public.change_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  row_id     text not null,
  label      text not null default '',
  op         text not null check (op in ('insert', 'update', 'delete')),
  old_row    jsonb,
  new_row    jsonb,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists change_log_row_idx on public.change_log (table_name, row_id, changed_at desc);
create index if not exists change_log_recent_idx on public.change_log (changed_at desc);
alter table public.change_log enable row level security;
drop policy if exists "change_log admin read" on public.change_log;
create policy "change_log admin read" on public.change_log for select using (public.is_admin());

-- Only changes made by a signed-in person are logged: seed scripts and the
-- service role run without auth.uid(), and logging them would bury the edits
-- that matter. updated_at churn alone is not a change.
create or replace function public.record_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) - 'updated_at' end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) - 'updated_at' end;
  v_row jsonb := coalesce(v_new, v_old);
  v_id  text;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and v_old = v_new then
    return new;
  end if;
  v_id := coalesce(v_row ->> 'id', v_row ->> 'term_id', concat_ws(':', v_row ->> 'area_id', v_row ->> 'profession_id'));
  insert into public.change_log (table_name, row_id, label, op, old_row, new_row, changed_by)
  values (
    tg_table_name,
    v_id,
    coalesce(v_row ->> 'name', v_row ->> 'alias', v_row ->> 'singular', ''),
    lower(tg_op),
    v_old,
    v_new,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists terms_change_log on public.terms;
create trigger terms_change_log after insert or update or delete on public.terms
  for each row execute function public.record_change();
drop trigger if exists profession_details_change_log on public.profession_details;
create trigger profession_details_change_log after insert or update or delete on public.profession_details
  for each row execute function public.record_change();
drop trigger if exists term_aliases_change_log on public.term_aliases;
create trigger term_aliases_change_log after insert or update or delete on public.term_aliases
  for each row execute function public.record_change();

-- ── Area intros (§05.2, §10) ────────────────────────────────────────────────
-- A templated intro is what Google's 2024 update penalises, so these are
-- written by hand, only for the area pages worth it, and only per
-- profession (a farrier page and a coach page for the same town say
-- different things).
create table if not exists public.area_intros (
  area_id       uuid not null references public.areas (id) on delete cascade,
  profession_id uuid not null references public.terms (id) on delete cascade,
  body          text not null default '',
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles (id) on delete set null,
  primary key (area_id, profession_id)
);
alter table public.area_intros enable row level security;
drop policy if exists "area_intros readable" on public.area_intros;
create policy "area_intros readable" on public.area_intros for select using (true);
drop policy if exists "area_intros admin write" on public.area_intros;
create policy "area_intros admin write" on public.area_intros for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists area_intros_change_log on public.area_intros;
create trigger area_intros_change_log after insert or update or delete on public.area_intros
  for each row execute function public.record_change();

-- ── Admin hide ─────────────────────────────────────────────────────────────
-- A lapsed plan hides a profile and a returning plan shows it again
-- (syncVisibility). An admin hide has to survive that, so it is its own flag.
alter table public.providers add column if not exists hidden_by_admin boolean not null default false;

-- Members can't clear an admin hide either.
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
  end if;
  return new;
end;
$$;

-- ── Profiles are private ───────────────────────────────────────────────────
-- The baseline let anyone read every profile, which is every account's
-- email address and unsubscribe token. A person reads their own row; admins
-- read everyone's (the Riders screen); everything else goes through the
-- service role or a security-definer function.
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable by owner or admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

-- A person can change their name, not their role, email or tokens.
create or replace function public.profiles_protect_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
    new.email_token := old.email_token;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields before update on public.profiles
  for each row execute function public.profiles_protect_fields();
