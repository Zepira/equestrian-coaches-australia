# CMS build checklist

Working list for **The Site as a CMS** (`content/handbook/cms-model.html`, revision 2, 24 Sep 2026). Section numbers (§) refer to that plan. Tick items as they land; each stage should leave the site working.

**Definition of done (§11):** add a profession in admin (say equine chiropractors), fill in its words, set it live, and nothing else. `/chiropractors`, its area pages, the Horse care menu and door colours, the footer, the sitemap, the search select, rider alerts, the monthly emails and the SEO digest all include it, with no deploy.

---

## 0. Before starting

- [x] Commit the current work (`c0d70f8`). `Claude outputs/` held back: the repo is public and it holds the partnership agreement drafts.
- [x] Export what's worth keeping: `node scripts/db/export-keepers.mjs` wrote `supabase/data/pre-rebuild-2026-09-24/` (gitignored): settings, 3 users (Kim has a second account at `gnail.com`, a typo; drop it), 2 admins, Alana's coach profile `alana-l` with its 10 terms and photo, 66 terms, 72 aliases, 53 suggestions, and all 6 stored files. No discipline copy or images had been edited in admin, and no area intros exist.
- [x] Sync `content/handbook/` with the newer copies in `Claude outputs/` (eight documents; `site-structure-1.html` became `site-structure.html`, "One Site, Two Front Doors"); manifest titles and dates updated.
- [x] Tidy CLAUDE.md contradictions: launch scope, the $14.95 tier mentions, founding offer terms. Domain and ASIC registration marked unconfirmed (the handbook says registered, the Status list says not): **confirm with Alana.**
- [x] Decided 24 Sep: prices at the lower figures ($9.99 / $24.95 / $49.95), configurable in admin. Card taken at sign-up, no charge until `founding_free_months` (6) after `launch_date`, which is set and locked on launch day (§09).
- [ ] Still open, not blocking: each profession's pitch copy.

## 1. Clean baseline (§03, §04)

**Status 24 Sep: done.** Alana ran `scripts/db/rebuild.mjs`; counts, route walk and signed-in flows verified (below). One fix afterwards: the restored profile's area (see the last list).

Schema, `supabase/migrations/0001_baseline.sql` (old `0001`–`0023` moved to `supabase/migrations/archive-pre-cms/`):

- [x] Types, including `profession`, `provider`, `provider_status`, `door`, `launch_state`, `availability`, `card_saved`/`trialing` plan statuses. All in their `create type`, nothing out of band.
- [x] Accounts: `profiles` (rider or provider), `admin_users`, `is_admin()`; signup trigger creates the provider row, owner membership and profession row for providers (accepts old `role=coach` links).
- [x] Places: `postcodes` (with lat/long), `areas`.
- [x] Taxonomy: `terms` (+ `parent_id`, `featured`, `featured_order`), aliases, suggestions (`for_term_id`), slug history (scoped by parent), `profession_details` (every field in §04 B; JSON validated in the app, stage 8).
- [x] Reserved profession slugs: DB check constraint + `src/lib/reserved-slugs.ts`.
- [x] Providers: `providers` (own id; status, review fields, cohort, acquisition_source, invite_id, organisation_id), `provider_members`, `provider_terms`, `provider_photos`, `testimonials`, `subscriptions` (service-role writes only), `invites`. RLS by membership (`is_provider_member()`); public reads on `status = 'published'`.
- [x] Activity: `events`, `enquiries` (`want` text), `favourites`, `rider_alerts`, `notifications_log`.
- [x] Measurement: `provider_events`, `search_events` (+ profession), `provider_month_stats`, `gsc_daily`.
- [x] Pages: `indexable_pages` stores ids only; `src/lib/page-paths.ts` builds the URL (so stage 3 is a code change). `recompute_indexable_pages(p_min_providers)` counts per profession.
- [x] Content: `settings` + history, `content_blocks` + history (triggers).
- [x] Functions: `nearby_providers()`, `riders_for_event()`, `events_for_rider()`, `nearest_postcode()`, `provider_is_subscribed()`, `slugify()`.
- [x] Storage policies for `provider-photos`, `provider-videos`, `term-images`; old coach bucket policies dropped by name.
- [ ] Enquiry retention (contact details deleted after 24 months): needs a scheduled job; do with the stage 7 crons.

Seed and reload, `scripts/db/rebuild.mjs --yes-wipe` (after `export-keepers.mjs`), seed content in `supabase/seed/professions.mjs`:

- [x] **Run** by Alana, 24 Sep. Verified counts: 18,533 postcodes all with an area, 17,515 areas, 9 professions + details, 61 disciplines/specialities (19 coaching + 42 horse care), 25 skills, 24 attributes (6 shared), 113 aliases (72 + 41, none lost), 53 suggestions, 2 accounts (typo account gone), 2 admins, `alana-l` published with its terms, photo (in `provider-photos`) and plan.
- [x] Written: wipe `public`, run baseline, empty and delete `coach-*` buckets, create `provider-*` buckets.
- [x] Written: reload postcodes (reads the CSV itself) and areas.
- [x] Written: nine professions + `profession_details` from today's code; disciplines, skills, attributes, aliases, suggestions from the export with ids kept (disciplines and skills under Riding coaches; four setup terms shared, plus "Mobile service" and "After-hours service"); horse care specialities and profession aliases; featured disciplines.
- [x] Written: settings (`launch_date` empty, `founding_free_months` 6, `founding_join_by` empty). Other settings get seeded when their accessor exists (review switch, alert emails, event reach, gates: stages 5–8).
- [ ] `content_blocks` seed: moved to stage 2, where each block's shape and reader are defined.
- [x] Written: accounts kept (logins survive; Kim's `gnail.com` account deleted), profiles rebuilt (coach becomes provider), both admins re-granted, Alana's `alana-l` rebuilt as a published founding provider with its terms, photo (re-uploaded to `provider-photos`) and plan. Nobody needs to sign up again.

Code renamed to match:

- [x] `src/`: tables, columns, buckets, RPCs, role checks. Coach stays where it means a riding coach (view models like `takingStudents`, `CoachCard`, `/coaches` routes).
- [x] `ensureCoachProfile` → `ensureProvider` / `getMyProvider` (`queries.ts`) and `requireProvider()` (`src/lib/provider-session.ts`); dashboard context carries `providerId` (the profile's id, not the user's).
- [x] Coaching reads scoped to the coaching profession (`getCoachingId`), so farrier specialities never appear in coach menus. Profile save keeps profession rows when it replaces terms.
- [x] Billing and the Stripe webhook write `subscriptions` with the service role; a live plan still publishes until stage 5's review queue.
- [x] Middleware: `/dashboard` gated on role provider; slug history lookup tolerates the parent-scoped key.
- [x] Founding settings (done in stage 0): `launch_date` (locks once set, enforced server-side), `founding_free_months`, `founding_join_by`; accessors, admin screen, `/for-coaches` and billing copy.
- [ ] Smoke scripts (`scripts/smoke/*.mjs`) and the design-reference suites still insert into the old tables. Update them after the rebuild runs, against the real schema.
- [x] After the rebuild, with throwaway accounts (deleted after, with their providers and the test enquiry): 19 public routes 200 with no errors; sign-up trigger makes a farrier provider with the farriers profession, an old `role=coach` link a coaching provider, a rider no provider; coach logs in, saves profile (fields, geocode, area, two disciplines, **profession row kept**), mock checkout (subscription active, profile published), appears in Bendigo search, creates an event (coaching profession + discipline) whose public page renders; admin disciplines/terms/aliases/settings render and disciplines lists coaching's 19 only; rider favourites and enquires to `alana-l`, saves an alert to `rider_alerts`, account page shows both; `riders_for_event()` matches the rider at 250 km.
- [ ] Stage 5: sign-up records every new provider as cohort `open`; while the founding offer is open it should record `founding` (pass `cohort` in the sign-up metadata).

Found and fixed while writing this stage (would have broken at runtime, not at compile time):

- `saveProfile` deleted every `provider_terms` row, which now includes the profession: saving the form would have removed a provider from their own profession.
- Upserts can't target expression or partial unique indexes: `provider_events` dedupe (index changed to plain columns), `notifications_log` (insert, ignore duplicates), `term_slug_history` (delete then insert).
- `events` has two foreign keys to `terms`, so the bare `terms(...)` embed on the event page would have been ambiguous; named explicitly.
- Known and carried over, not fixed: the SEO digest's 90-day prune list can never fill, because the nightly recompute recreates every row (needs a `first_eligible_at`).
- After the run: `alana-l` came back with no area, because its stored postcode (3178, Rowville) disagrees with its suburb (Lilydale, 3140) and the script matched on both. Fixed in the database (area by suburb and state, as the old profile had it) and in `rebuild.mjs`; the gate recompute then produced its four (ineligible) area rows. Worth correcting the postcode on the profile.

## 2. Read from rows (§02, §05.5)

- [ ] Server readers with code fallbacks: `getProfessions()`, `getProfession(slug)`, `getContentBlock(key)`; one typed reader per block; 60s cache + tag revalidation on admin save.
- [ ] `professions.ts` shrinks to types + reader; `mock-professionals.ts` reads specialities/professions from the DB.
- [ ] Header menus, footer, home page, both door pages, `/list-your-business`, sitemap, search select read professions and copy from rows.
- [ ] `topDisciplineSlugs` → `terms.featured` + `featured_order`.
- [ ] Tier names, prices, taglines, capabilities from settings; delete the duplicates on `/for-coaches` and billing (`tiers.ts` keeps types and the gating function only).
- [ ] **Design task:** render `data-door` / `data-overlay-route` on `<html>` from the server without making every page dynamic. Reading `headers()` in the root layout opts every route out of static rendering; prefer a layout inside the `[profession]` segment (it receives `params`) or route-group root layouts per door. Then delete the inline script, `OVERLAY_ROUTES`, `HORSE_CARE_PREFIXES` and the header effect.
- [ ] Check: every page looks identical before and after (parity suites, route walk).

## 3. Routes (§05.3, §05.4)

- [ ] One profession template: `/[profession]`, `/[profession]/[term]`, `/[profession]/in/[area]`, `/[profession]/[term]/in/[area]` (coaches included: `/coaches/...`).
- [ ] Decide how `/coaches` is both the Coaches door landing and the coaching profession section (today it is the coaches home); same question for any single-profession door.
- [ ] `/profile/[slug]` for every provider; remove `/coaches/[slug]`.
- [ ] Public event page: `/clinics/[id]` → `/events/[id]` (the plan reserves `/events` but doesn't say where event pages live).
- [ ] Reserved words enforced in the admin form and the DB.
- [ ] Redirect map generated from the DB (provider slugs checked before term slugs), old discipline and riding-instructors paths, `/horse-care/[slug]` → section.
- [ ] Sitemap, canonical tags, structured-data URLs all from one BASE_URL.

## 4. Providers and search (§05.1, §05.2, §05.6)

- [ ] `nearby_providers()`: profession ids + discipline/skill/attribute arrays; OR within a kind, AND across; based-in above travels-to; remote only where `remote_allowed`, never on suburb pages; never mixes doors.
- [ ] Per-profession gates and featured rules (min 8 of that profession, max 3 per profession per area).
- [ ] Search page gains a profession scope (still noindex).
- [ ] Structured data: `Person` job title from the profession row, `knowsAbout` from specialities, `LocalBusiness` when business_name, `Event` for every profession's events.
- [ ] Fallback ladder assertion: nightly count of published providers on zero live pages (should be 0), surfaced in the digest.

## 5. Sign-up and review (§06)

- [ ] Entry links carry profession, plan, ref, utm: `/for-coaches`, `/for-professionals` (new, profession picker + that profession's pitch), `/list-your-business`, `/join/[profession]`.
- [ ] Fix the `?plan=` vs `?tier=` bug.
- [ ] Sign-up: name, email, password, profession shown with "change"; creates provider + membership (status draft); acquisition_source and cohort recorded; email confirm → onboarding.
- [ ] Onboarding, five screens, autosave: what you do (profession, "I also do…", specialities with suggestions), where you work (base, radius, owners come to you, remote if allowed, business name), you (photo, headline, bio, qualifications/registration/insurance "supplied by"), contact (form, phone, email, click-to-reveal), plan (founding while open, else three plans with the profession's labels). Labels from the profession row.
- [ ] Preview + submit (minimum: photo, bio, one speciality, location) → `in_review`, "we'll have a look" message.
- [ ] Review alert email to `review_alert_emails` with a one-click queue link.
- [ ] Review actions: publish (sends the where-you-appear email) / ask for changes (note shown to the provider). `review_required` off → auto-publish + "new provider" notice.
- [ ] Edits to published profiles go live; photo/name changes listed under "recent changes" in admin.
- [ ] Invites: admin creates (name, email, profession, optional prefill), link opens pre-filled sign-up, single use, expiring, records Kim as source.
- [ ] Founding: eligibility by sign-up date vs `founding_join_by`; Spotlight free until `launch_date` + `founding_free_months`, then Listed at the founding $9.99 Stripe price; cohort founding/open fixed at sign-up.
- [ ] Card at sign-up: Stripe Checkout in setup mode (card saved, no subscription) while `launch_date` is empty; plain wording beside the card field ("nothing is charged until six months after we launch; we'll email the exact date on launch day").
- [ ] Launch-day action in admin: set `launch_date` (then locked), create each saved-card founding member's subscription with `trial_end` = first charge date, email everyone their date.
- [ ] After launch: founding sign-ups get the subscription with its trial straight away. Reminder emails 30, 14 and 3 days before the first charge.

## 6. Riders (§07)

- [ ] `rider_alerts` UI on `/account`: several alerts, each with place + radius, door or professions, optional terms, what to hear about.
- [ ] Matching: new events and new providers → riders; event reach = alert radius, Clinic tier = `event_reach_km`.
- [ ] Saved providers for any profession; "Coming up near you" across followed professions.
- [ ] Rider monthly email: one email, a section per door followed.
- [ ] Consent stored per alert; one-click unsubscribe in every email, honoured at once.

## 7. Proof (§08)

- [ ] Every `provider_events` / `search_events` / `provider_month_stats` row carries profession_id; benchmarks compare within a profession.
- [ ] Monthly numbers email (good month + zero month) as content blocks with profession nouns as variables.
- [ ] Completeness score: items, weights and wording from `profession_details.completeness`; "one thing to do this month".
- [ ] Mention prompt as a content block (first name + brand).
- [ ] Dashboard: same tabs for all, labels from the profession row, stats split by section for two-profession providers.
- [ ] SEO digest: URL groups from profession rows; zero-result searches split by profession.

## 8. Admin (§10)

- [ ] Tabs regrouped: lists / says / charges / who.
- [ ] Professions editor (every `profession_details` field, glyph picker from the code library, launch state, menu order).
- [ ] Specialities and disciplines: today's editor + profession filter + featured.
- [ ] Skills and setup, aliases: + which profession a term belongs to.
- [ ] Pages: one form per page (home, each door, list-your-business, professionals pitch, About, FAQ).
- [ ] Emails: subject/body per email, variables listed, "send me a test".
- [ ] Plans and prices: names, taglines, display price + Stripe price ID pair verified against Stripe on save, founding price, capability map, net-after-fees beside each price, "affects new subscriptions only, N stay on their price".
- [ ] Settings: launch date (lock once set), founding months and join-by, review switch, alert emails, event reach, gates, limits.
- [ ] Review queue (count on the tab), Providers list (filter by profession/status/cohort, hide/unhide, source, recent changes), Invites, Riders (counts, unsubscribes, delete on request), Areas (intros per profession).
- [ ] Every save revalidates the pages showing it; history list on every screen.

## 9. Before launch (§12)

- [ ] Terms of service and privacy policy covering every profession: registration numbers and insurance shown as supplied by the provider, never checked by us (solicitor).
- [ ] Mock providers switched off wherever real ones exist.
- [ ] Run the definition-of-done test with a throwaway profession, then delete it.
- [ ] Full route walk, parity suites, nav/home/search behaviour suites, production build.
