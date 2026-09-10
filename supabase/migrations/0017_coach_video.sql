-- Coach intro video — one video per coach. Spotlight-tier pricing copy
-- (CLAUDE.md) promises "video" as a paid-tier perk, but the tier revision to
-- Listed/Spotlight/Clinic (7 Sep 2026) hasn't been migrated into the
-- `subscription_tier` enum yet — it's still 'standard'/'standard_plus_clinics'
-- from the original two-tier model. Rather than invent an enum value that
-- doesn't exist anywhere else in the schema, video is gated in the app layer
-- on `subscription_status = 'active'` (any paid plan) until that tier
-- migration happens — see requireVideoTierCoach() in
-- src/app/dashboard/profile/actions.ts.
alter table public.coach_profiles
  add column video_url text,
  add column video_storage_path text;

-- Same shape as coach-photos (0002_storage.sql): stored at
-- `coach-videos/<coach_id>/<filename>` so RLS keys off the path's first
-- folder segment matching auth.uid().
insert into storage.buckets (id, name, public)
values ('coach-videos', 'coach-videos', true)
on conflict (id) do nothing;

create policy "coach videos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'coach-videos');

create policy "coaches upload their own videos"
  on storage.objects for insert
  with check (
    bucket_id = 'coach-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "coaches update their own videos"
  on storage.objects for update
  using (
    bucket_id = 'coach-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "coaches delete their own videos"
  on storage.objects for delete
  using (
    bucket_id = 'coach-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
