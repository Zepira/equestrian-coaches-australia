-- Business settings editable in /admin (CLAUDE.md "Configuration over
-- hardcoding"). One row per key, value stored as text and parsed by a typed
-- accessor in src/lib/settings.ts, which also holds the code default for
-- every key — a missing row never crashes and never resolves to zero.
--
-- Every change is recorded in settings_history by trigger, so a number that
-- moved for no visible reason can always be traced to a person and a time.

create table public.settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create table public.settings_history (
  id         bigint generated always as identity primary key,
  key        text not null,
  old_value  text,
  new_value  text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index settings_history_key_idx on public.settings_history (key, changed_at desc);

create function public.settings_record_history()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.value is not distinct from old.value then
    return new;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  insert into public.settings_history (key, old_value, new_value, changed_by)
  values (new.key, case when tg_op = 'UPDATE' then old.value end, new.value, auth.uid());
  return new;
end;
$$;

create trigger settings_history
  before insert or update on public.settings
  for each row execute function public.settings_record_history();

-- Public pages read these anonymously (the founding-offer date is printed on
-- /for-coaches), and nothing in here is secret. Writes are admin only.
alter table public.settings enable row level security;
create policy "settings readable" on public.settings
  for select using (true);
create policy "settings admin write" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.settings_history enable row level security;
create policy "settings_history admin only" on public.settings_history
  for select using (public.is_admin());

-- Seed. The trigger writes the first history row.
insert into public.settings (key, value) values
  ('founding_offer_ends', '2027-04-30');
