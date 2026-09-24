-- Seed the launch discipline taxonomy. Matches src/lib/disciplines.ts —
-- once this table is live, that file's data should be fetched from here
-- instead (phase 4), but the slugs must stay in sync until then.
insert into public.disciplines (slug, name, blurb, sort_order) values
  ('bridleless', 'Bridleless', 'Riding without a bridle, built step by step from the groundwork up.', 1),
  ('working-equitation', 'Working Equitation', 'Dressage, ease of handling and speed — the all-round discipline, taught by coaches who compete in it.', 2),
  ('liberty', 'Liberty', 'Connection and communication at liberty, with no tack between you and the horse.', 3),
  ('western', 'Western', 'Western riding fundamentals through to reining, cutting and campdraft prep.', 4),
  ('dressage', 'Dressage', 'Classical dressage from first flatwork through to FEI-level training.', 5),
  ('show-jumping', 'Show Jumping', 'Course walking, striding and jump technique for the competition ring.', 6),
  ('eventing', 'Eventing', 'Dressage, cross-country and show jumping, coached across all three phases.', 7),
  ('campdrafting', 'Campdrafting', 'Cattle work and camp craft for the drafting arena.', 8),
  ('natural-horsemanship', 'Natural Horsemanship', 'Groundwork-first training focused on horse psychology and partnership.', 9),
  ('pony-club', 'Pony Club', 'All-round instruction for junior and pony club riders working through their levels.', 10),
  ('para-equestrian', 'Para-Equestrian', 'Adaptive coaching for para riders, across grades and disciplines.', 11)
on conflict (slug) do nothing;
