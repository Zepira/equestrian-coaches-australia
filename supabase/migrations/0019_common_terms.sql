-- The specialities most people in a profession do, picked by an admin on the
-- profession editor. Onboarding lists them first. They are never pre-ticked:
-- a box someone skips past would list them for work they don't do.
-- Kept on profession_details so the editor's Save and change_log cover them.
-- Ids that no longer point at an active speciality of the profession are
-- ignored on read.
alter table public.profession_details
  add column if not exists common_term_ids uuid[] not null default '{}';

notify pgrst, 'reload schema';
