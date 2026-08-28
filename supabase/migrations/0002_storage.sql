-- Coach photo storage — phase 3 of the build plan.
-- Photos are stored at `coach-photos/<coach_id>/<filename>` so RLS can key
-- off the path's first folder segment matching auth.uid().

insert into storage.buckets (id, name, public)
values ('coach-photos', 'coach-photos', true)
on conflict (id) do nothing;

create policy "coach photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'coach-photos');

create policy "coaches upload their own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'coach-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "coaches update their own photos"
  on storage.objects for update
  using (
    bucket_id = 'coach-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "coaches delete their own photos"
  on storage.objects for delete
  using (
    bucket_id = 'coach-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
