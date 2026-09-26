-- Small follow-ups after the Marketing Engine (26 Sep 2026).

-- ── Stars on search cards ────────────────────────────────────────────────
-- Reviews are admin-only rows (the reviewer's email is on them), so the
-- public gets only what a profile already shows: how many published reviews
-- a professional has and their average.
create or replace function public.review_stats(p_ids uuid[])
returns table (provider_id uuid, reviews integer, average numeric)
language sql stable security definer set search_path = public
as $$
  select r.provider_id, count(*)::integer, round(avg(r.rating)::numeric, 1)
  from reviews r
  where r.status = 'published' and r.provider_id = any (p_ids)
  group by r.provider_id;
$$;
grant execute on function public.review_stats(uuid[]) to anon, authenticated;

-- ── Photo entries for competitions ───────────────────────────────────────
alter table public.competitions add column if not exists entry_photo text not null default 'none' check (entry_photo in ('none', 'optional', 'required'));
alter table public.competition_entries add column if not exists photo_path text;
-- Private: entrants' photos are seen by whoever judges, through signed links, never publicly.
insert into storage.buckets (id, name, public) values ('entry-photos', 'entry-photos', false) on conflict (id) do nothing;

-- ── Asking a quiet rider again ───────────────────────────────────────────
-- A sequence starts once per person, except one marked repeatable in code
-- (the quiet rider check: someone who pressed "keep" and went quiet again a
-- year later is asked again). One run per person per start time instead.
alter table public.sequence_runs drop constraint if exists sequence_runs_sequence_key_subject_id_key;
create unique index if not exists sequence_runs_one_per_start on public.sequence_runs (sequence_key, subject_id, started_at);
-- Never two running at once for the same person and sequence.
create unique index if not exists sequence_runs_one_running on public.sequence_runs (sequence_key, subject_id) where stopped_at is null;
