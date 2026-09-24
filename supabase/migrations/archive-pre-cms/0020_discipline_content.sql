-- Discipline pages become admin-editable content (16 Sep 2026).
--
-- `terms` already carries the taxonomy (name, slug, blurb, active,
-- generates_pages). This adds what a public discipline page needs beyond a
-- label: a longer description, a photograph with alt text and a credit, and
-- the SEO pair. All nullable/empty by default — every existing row keeps
-- rendering exactly as before, and the app falls back to the seeded blurb
-- and the stock photo set until an admin fills a field in.
--
-- Skills and attributes get the same columns for free (one table), which is
-- what the spec wants for the day one of them is promoted to its own page.

alter table public.terms
  add column if not exists description     text not null default '',
  add column if not exists image_path      text,
  add column if not exists image_alt       text not null default '',
  add column if not exists image_credit    text not null default '',
  add column if not exists seo_title       text not null default '',
  add column if not exists seo_description text not null default '';

comment on column public.terms.description is 'Long-form copy for the term''s own page. Plain paragraphs separated by blank lines.';
comment on column public.terms.image_path is 'Path inside the term-images bucket, e.g. discipline/dressage/1726480000.jpg. Null = use the app''s stock fallback.';
comment on column public.terms.seo_title is 'Overrides the page <title> when set; the app builds one from the name otherwise.';
comment on column public.terms.seo_description is 'Overrides the meta description when set; the app builds one from the blurb otherwise.';

-- Images live in their own public bucket, written only by admins. Same
-- shape as coach-photos (0002_storage.sql) but keyed on is_admin() rather
-- than a per-user folder — a discipline's photo belongs to the site.
insert into storage.buckets (id, name, public)
values ('term-images', 'term-images', true)
on conflict (id) do nothing;

drop policy if exists "term images are publicly readable" on storage.objects;
create policy "term images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'term-images');

drop policy if exists "admins upload term images" on storage.objects;
create policy "admins upload term images"
  on storage.objects for insert
  with check (bucket_id = 'term-images' and public.is_admin());

drop policy if exists "admins update term images" on storage.objects;
create policy "admins update term images"
  on storage.objects for update
  using (bucket_id = 'term-images' and public.is_admin());

drop policy if exists "admins delete term images" on storage.objects;
create policy "admins delete term images"
  on storage.objects for delete
  using (bucket_id = 'term-images' and public.is_admin());
