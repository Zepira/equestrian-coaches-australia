-- Phase 6: clinic notifications need an email address to send to.
-- `auth.users.email` isn't exposed via PostgREST, so mirror it onto
-- `profiles` (written once at signup, read freely by the notification
-- matcher running under the service-role key).
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'rider'),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;
