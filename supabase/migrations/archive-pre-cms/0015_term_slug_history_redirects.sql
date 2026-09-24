-- Slug trap fix (spec: "a term slug in a live URL must be read-only once
-- indexable; changes go through a deliberate action that writes
-- term_slug_history and middleware 301s the old slug"). term_slug_history
-- itself was created admin-only in 0007_taxonomy.sql — that was correct for
-- writes, but the redirect middleware runs on every anonymous request and
-- needs to read it too. There's nothing sensitive in an old-slug→term
-- mapping, so open up select the same way indexable_pages did.
create policy "term_slug_history readable by everyone"
  on public.term_slug_history for select
  using (true);
