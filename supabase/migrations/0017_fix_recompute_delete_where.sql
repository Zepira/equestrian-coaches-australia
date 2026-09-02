-- Fix: recompute_indexable_pages() (0012_indexable_pages.sql) did an
-- unqualified `delete from public.indexable_pages`. Supabase's PostgREST
-- connection role (`authenticator`) preloads the `safeupdate` extension,
-- which rejects any UPDATE/DELETE with no WHERE clause — but only over the
-- PostgREST/RPC path, not a direct psql/pg connection. That meant the
-- function worked fine when run directly at migration time (how it was
-- originally verified) but has been failing with "DELETE requires a WHERE
-- clause" every time the real app calls it via supabase.rpc() — i.e. the
-- nightly Vercel Cron job (/api/cron/recompute-indexable-pages) has been
-- silently 500ing in production, never actually recomputing eligibility.
-- Fix is a no-op WHERE clause — same delete-everything semantics, just
-- syntactically satisfies safeupdate's check.
create or replace function public.recompute_indexable_pages()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.indexable_pages where true;

  insert into public.indexable_pages
    (page_type, area_id, discipline_id, slug, coach_count, eligible, last_coach_change, computed_at)
  select
    'area',
    cp.area_id,
    null,
    'riding-instructors/' || a.slug,
    count(distinct cp.id),
    count(distinct cp.id) >= 3,
    max(cp.updated_at),
    now()
  from public.coach_profiles cp
  join public.areas a on a.id = cp.area_id
  where cp.published = true and cp.area_id is not null
  group by cp.area_id, a.slug;

  insert into public.indexable_pages
    (page_type, area_id, discipline_id, slug, coach_count, eligible, last_coach_change, computed_at)
  select
    'discipline_area',
    cp.area_id,
    t.id,
    'disciplines/' || t.slug || '/' || a.slug,
    count(distinct cp.id),
    count(distinct cp.id) >= 3,
    max(cp.updated_at),
    now()
  from public.coach_profiles cp
  join public.coach_terms ct on ct.coach_id = cp.id
  join public.terms t on t.id = ct.term_id
    and t.kind = 'discipline' and t.generates_pages = true and t.active = true
  join public.areas a on a.id = cp.area_id
  where cp.published = true and cp.area_id is not null
  group by cp.area_id, t.id, t.slug, a.slug;
end;
$$;
