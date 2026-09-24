-- Phase 9: migrate the existing discipline data into `terms`/`coach_terms`,
-- then seed the launch vocabulary (aliases, skills, attributes, curated
-- suggestions). Safe to run now — only test/mock coaches exist.

-- ── 1. fold disciplines -> terms ────────────────────────────────────────
insert into public.terms (id, kind, slug, name, blurb, generates_pages, sort_order)
select id, 'discipline', slug, name, blurb, true, sort_order
from public.disciplines;

insert into public.coach_terms (coach_id, term_id, sort_order)
select coach_id, discipline_id, 0
from public.coach_disciplines;

-- ── 2. extra disciplines worth seeding now (real AU disciplines, own
--    small uncontested search volume, costs nothing to add) ─────────────
insert into public.terms (kind, slug, name, blurb, generates_pages, sort_order) values
  ('discipline', 'trail-riding', 'Trail Riding', 'Trail and bush riding, on your horse or a lesson horse, out on real terrain.', true, 20),
  ('discipline', 'showing-hack', 'Showing & Hack', 'Led and ridden showing, hack classes and led classes for the show ring.', true, 21),
  ('discipline', 'polocrosse', 'Polocrosse', 'Polocrosse coaching, from first swings to representative squads.', true, 22),
  ('discipline', 'endurance', 'Endurance', 'Endurance riding, conditioning and vetting-out coaching for long-distance rides.', true, 23),
  ('discipline', 'stock-horse', 'Stock Horse', 'Australian Stock Horse work — station skills, campdraft prep and led/ridden classes.', true, 24),
  ('discipline', 'mounted-games', 'Mounted Games', 'Mounted games coaching for pony club and club-level competitors.', true, 25),
  ('discipline', 'vaulting', 'Vaulting', 'Equestrian vaulting — gymnastics on horseback, solo or team.', true, 26),
  ('discipline', 'carriage-driving', 'Carriage Driving', 'Carriage and harness driving, from recreational to competitive combined driving.', true, 27);

-- ── 3. discipline aliases (bold/primary from the spec vocab, used
--    deterministically in generated page titles) ────────────────────────
insert into public.term_aliases (term_id, alias, is_primary, source)
select t.id, v.alias, v.is_primary, 'seed'
from (values
  ('dressage', 'dressage lessons', true),
  ('dressage', 'dressage instructor', false),
  ('dressage', 'dressage trainer', false),
  ('dressage', 'dressage coaching', false),
  ('dressage', 'flatwork', false),
  ('dressage', 'flatwork coach', false),
  ('dressage', 'competition dressage', false),
  ('dressage', 'dressage tests', false),

  ('show-jumping', 'showjumping lessons', true),
  ('show-jumping', 'show jumping coach', false),
  ('show-jumping', 'showjumping instructor', false),
  ('show-jumping', 'jumping lessons', false),
  ('show-jumping', 'jump training', false),
  ('show-jumping', 'gridwork', false),
  ('show-jumping', 'stadium jumping', false),

  ('eventing', 'eventing coach', true),
  ('eventing', 'event rider coach', false),
  ('eventing', 'horse trials', false),
  ('eventing', 'one day event', false),
  ('eventing', 'ode coaching', false),
  ('eventing', 'cross country coaching', false),
  ('eventing', 'xc coaching', false),
  ('eventing', 'three day eventing', false),

  ('western', 'western riding lessons', true),
  ('western', 'western coach', false),
  ('western', 'western trainer', false),
  ('western', 'reining', false),
  ('western', 'reining trainer', false),
  ('western', 'western pleasure', false),
  ('western', 'ranch riding', false),
  ('western', 'western performance', false),
  ('western', 'cutting', false),
  ('western', 'pole bending', false),

  ('campdrafting', 'campdraft coaching', true),
  ('campdrafting', 'campdraft', false),
  ('campdrafting', 'campdraft school', false),
  ('campdrafting', 'campdraft clinic', false),
  ('campdrafting', 'drafting lessons', false),

  ('liberty', 'liberty training', true),
  ('liberty', 'liberty coach', false),
  ('liberty', 'at liberty', false),
  ('liberty', 'liberty horsemanship', false),
  ('liberty', 'liberty lessons', false),
  ('liberty', 'free work', false),

  ('bridleless', 'bridleless trainer', true),
  ('bridleless', 'bridleless riding', false),
  ('bridleless', 'bridleless lessons', false),
  ('bridleless', 'riding without a bridle', false),
  ('bridleless', 'neck rope riding', false),

  ('natural-horsemanship', 'natural horsemanship trainer', true),
  ('natural-horsemanship', 'horsemanship lessons', false),
  ('natural-horsemanship', 'groundwork coach', false),
  ('natural-horsemanship', 'join up', false),
  ('natural-horsemanship', 'connection training', false),
  ('natural-horsemanship', 'relationship training', false),

  ('pony-club', 'pony club coach', true),
  ('pony-club', 'pony club instructor', false),
  ('pony-club', 'pony club rally coach', false),
  ('pony-club', 'junior riding lessons', false),
  ('pony-club', 'gymkhana coaching', false),

  ('para-equestrian', 'para equestrian coach', true),
  ('para-equestrian', 'para dressage', false),
  ('para-equestrian', 'adaptive riding', false),
  ('para-equestrian', 'disability riding lessons', false),
  ('para-equestrian', 'rda coach', false),
  ('para-equestrian', 'accessible riding', false),

  ('working-equitation', 'working equitation coach', true),
  ('working-equitation', 'working equitation lessons', false),
  ('working-equitation', 'we coaching', false),
  ('working-equitation', 'ease of handling', false),
  ('working-equitation', 'obstacle course riding', false),
  ('working-equitation', 'garrocha', false)
) as v(slug, alias, is_primary)
join public.terms t on t.kind = 'discipline' and t.slug = v.slug;

-- ── 4. skills (what a coach fixes — filters + page content, no URLs) ────
insert into public.terms (kind, slug, name, generates_pages, sort_order) values
  ('skill', 'starting-young-horses', 'Starting young horses', false, 1),
  ('skill', 'groundwork-handling', 'Groundwork & handling', false, 2),
  ('skill', 'lunging-long-reining', 'Lunging & long-reining', false, 3),
  ('skill', 'float-loading', 'Float loading & travel', false, 4),
  ('skill', 'trailer-training', 'Trailer training', false, 5),
  ('skill', 'problem-behaviour', 'Problem behaviour & re-schooling', false, 6),
  ('skill', 'spooking-napping', 'Spooking & napping', false, 7),
  ('skill', 'ottb-retraining', 'Retraining off-the-track thoroughbreds', false, 8),
  ('skill', 'rehabilitation', 'Rehabilitation & return to work', false, 9),
  ('skill', 'confidence-building', 'Confidence building', false, 10),
  ('skill', 'returning-after-fall', 'Getting back on after a fall', false, 11),
  ('skill', 'adult-beginners', 'Adult beginners', false, 12),
  ('skill', 'returning-to-riding', 'Returning to riding', false, 13),
  ('skill', 'rider-biomechanics', 'Rider biomechanics & position', false, 14),
  ('skill', 'fitness-conditioning', 'Fitness & conditioning', false, 15),
  ('skill', 'lateral-work', 'Lateral work', false, 16),
  ('skill', 'jumping-technique', 'Jumping technique & gridwork', false, 17),
  ('skill', 'cross-country-schooling', 'Cross-country schooling', false, 18),
  ('skill', 'dressage-test-riding', 'Dressage test riding & scoring', false, 19),
  ('skill', 'stock-work', 'Stock work & cattle handling', false, 20),
  ('skill', 'trick-training', 'Trick training', false, 21),
  ('skill', 'competition-preparation', 'Competition preparation', false, 22),
  ('skill', 'first-show-preparation', 'First-show preparation', false, 23),
  ('skill', 'clinics-camps', 'Clinics & camps', false, 24),
  ('skill', 'trail-road-safety', 'Trail & road safety', false, 25);

-- ── 5. attributes (practical facts, filters/badges — never their own
--    pages). travels_to_rider already exists as a coach_profiles column
--    (spec: surface it as a filter alongside these, don't duplicate it
--    here or the two will disagree). ────────────────────────────────────
insert into public.terms (kind, slug, name, generates_pages, sort_order) values
  ('attribute', 'horses-available', 'Horses available for lessons', false, 1),
  ('attribute', 'own-arena', 'Own arena', false, 2),
  ('attribute', 'indoor-arena', 'Indoor arena', false, 3),
  ('attribute', 'xc-course-on-site', 'Cross-country course on site', false, 4),
  ('attribute', 'agistment-available', 'Agistment available', false, 5),
  ('attribute', 'beginners-welcome', 'Beginners welcome', false, 6),
  ('attribute', 'children-juniors', 'Children & juniors', false, 7),
  ('attribute', 'adults-only', 'Adults only', false, 8),
  ('attribute', 'all-ages', 'All ages', false, 9),
  ('attribute', 'nervous-riders', 'Nervous riders', false, 10),
  ('attribute', 'ndis-registered', 'NDIS registered', false, 11),
  ('attribute', 'private-lessons', 'Private lessons', false, 12),
  ('attribute', 'group-lessons', 'Group lessons', false, 13),
  ('attribute', 'clinics-workshops', 'Clinics & workshops', false, 14),
  ('attribute', 'online-coaching', 'Online & video coaching', false, 15),
  ('attribute', 'weekend-availability', 'Weekend availability', false, 16),
  ('attribute', 'weekday-availability', 'Weekday availability', false, 17),
  ('attribute', 'ea-accredited', 'EA accredited', false, 18),
  ('attribute', 'pony-club-accredited', 'Pony Club accredited', false, 19),
  ('attribute', 'wwcc', 'Working with Children Check', false, 20),
  ('attribute', 'insured', 'Insured', false, 21),
  ('attribute', 'first-aid-certified', 'First aid certified', false, 22);

-- ── 6. curated term_suggestions — what to offer a coach once they pick a
--    discipline, capped around 8. Data-driven rows ("other Western
--    coaches also list...") land later once 10+ coaches share a
--    discipline; this is the hand-curated starting set. ─────────────────
insert into public.term_suggestions (discipline_id, term_id, sort_order)
select d.id, s.id, v.ord
from (values
  ('dressage', 'lateral-work', 1), ('dressage', 'dressage-test-riding', 2),
  ('dressage', 'confidence-building', 3), ('dressage', 'competition-preparation', 4),
  ('dressage', 'own-arena', 5), ('dressage', 'ea-accredited', 6),

  ('show-jumping', 'jumping-technique', 1), ('show-jumping', 'confidence-building', 2),
  ('show-jumping', 'competition-preparation', 3), ('show-jumping', 'first-show-preparation', 4),
  ('show-jumping', 'own-arena', 5), ('show-jumping', 'ea-accredited', 6),

  ('eventing', 'cross-country-schooling', 1), ('eventing', 'jumping-technique', 2),
  ('eventing', 'dressage-test-riding', 3), ('eventing', 'competition-preparation', 4),
  ('eventing', 'xc-course-on-site', 5), ('eventing', 'ea-accredited', 6),

  ('western', 'stock-work', 1), ('western', 'starting-young-horses', 2),
  ('western', 'groundwork-handling', 3), ('western', 'confidence-building', 4),
  ('western', 'own-arena', 5),

  ('campdrafting', 'stock-work', 1), ('campdrafting', 'starting-young-horses', 2),
  ('campdrafting', 'competition-preparation', 3), ('campdrafting', 'confidence-building', 4),

  ('liberty', 'groundwork-handling', 1), ('liberty', 'confidence-building', 2),
  ('liberty', 'trick-training', 3), ('liberty', 'problem-behaviour', 4),

  ('bridleless', 'groundwork-handling', 1), ('bridleless', 'confidence-building', 2),
  ('bridleless', 'trick-training', 3),

  ('natural-horsemanship', 'groundwork-handling', 1), ('natural-horsemanship', 'starting-young-horses', 2),
  ('natural-horsemanship', 'problem-behaviour', 3), ('natural-horsemanship', 'confidence-building', 4),
  ('natural-horsemanship', 'spooking-napping', 5),

  ('pony-club', 'adult-beginners', 1), ('pony-club', 'children-juniors', 2),
  ('pony-club', 'confidence-building', 3), ('pony-club', 'first-show-preparation', 4),
  ('pony-club', 'group-lessons', 5), ('pony-club', 'pony-club-accredited', 6),

  ('para-equestrian', 'ndis-registered', 1), ('para-equestrian', 'confidence-building', 2),
  ('para-equestrian', 'nervous-riders', 3), ('para-equestrian', 'private-lessons', 4),

  ('working-equitation', 'lateral-work', 1), ('working-equitation', 'stock-work', 2),
  ('working-equitation', 'competition-preparation', 3), ('working-equitation', 'confidence-building', 4)
) as v(discipline_slug, skill_slug, ord)
join public.terms d on d.kind = 'discipline' and d.slug = v.discipline_slug
join public.terms s on s.kind in ('skill', 'attribute') and s.slug = v.skill_slug;

-- ── 7. clean up the old parallel tables now that everything's folded in ─
-- clinics.discipline_id pointed at disciplines(id) — same UUIDs now live
-- in terms (preserved by the `insert ... select id, ...` above), so just
-- repoint the FK before dropping the old table.
alter table public.clinics drop constraint if exists clinics_discipline_id_fkey;
alter table public.clinics
  add constraint clinics_discipline_id_fkey foreign key (discipline_id) references public.terms (id);

drop table public.coach_disciplines;
drop table public.disciplines;
