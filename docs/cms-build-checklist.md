# CMS build checklist

Working list for **The Site as a CMS** (`content/handbook/cms-model.html`, revision 2, 24 Sep 2026). Section numbers (§) refer to that plan. Tick items as they land; each stage should leave the site working.

**Definition of done (§11):** add a profession in admin (say equine chiropractors), fill in its words, set it live, and nothing else. `/chiropractors`, its area pages, the Horse care menu and door colours, the footer, the sitemap, the search select, rider alerts, the monthly emails and the SEO digest all include it, with no deploy.

---

## 0. Before starting

- [ ] Commit or stash the current uncommitted work (horse care launch, logo, CMS plan) so the rebuild starts from a clean tree.
- [ ] Export anything worth keeping from the live DB: settings rows, the two admin user ids, any discipline copy/images edited in `/admin/disciplines` (the `term-images` bucket and the `terms` content columns).
- [ ] Sync `content/handbook/` with the newer copies in `Claude outputs/` (`site-structure-1.html` is "One Site, Two Front Doors"; the other six have name-sweep updates). Update `src/lib/handbook.ts` titles and dates to match.
- [ ] Tidy CLAUDE.md contradictions: "launch scope is coaches only", the $14.95 tier mentions, domain registered vs not, founding offer length (now: dates in settings, §09).
- [ ] Still open, not blocking the build (§13): $24.95 / $49.95 with Kim; card at founding sign-up or at the end of the free period; each profession's pitch copy.

## 1. Clean baseline (§03, §04)

Schema, one new baseline migration replacing `0001`–`0023`:

- [ ] Types: `term_kind` (discipline, skill, attribute, profession); `user_role` (rider, provider); `provider_status` (draft, in_review, published, hidden, changes_requested); tier (listed, spotlight, clinic); event and analytics kinds; `area_kind`; `indexable_page_type` (profession_area, profession_term_area); `taking_students`; `enquiry_status`.
- [ ] Accounts: `profiles` (role rider or provider), `admin_users`, `is_admin()`, the signup trigger (role from metadata, provider allowed).
- [ ] Places: `postcodes`, `areas` (with lat/long, intro, per-profession intro if §10 needs it).
- [ ] Taxonomy: `terms` (+ `parent_id`, `featured`, `featured_order`, content columns from 0020), `term_aliases`, `term_suggestions`, `term_slug_history`, `profession_details`.
- [ ] `profession_details` columns: door, glyph_key, sort_order, launch_state; singular, plural, short, term_noun(+plural), audience_noun, years_label, job_title; hero headline / lead / short lead, one-liner, steps (json), faq (json), pitch; enquiry_options (json), events_enabled, remote_allowed, tier_labels (json), completeness (json). JSON shapes validated on save (zod).
- [ ] Reserved slug check on profession slugs (code list mirrored as a DB check constraint, §05.4).
- [ ] Providers: `providers` (own id; name, slug, headline, bio, suburb/state/postcode, location + lat/long, area_id, travel_radius_km, remote, business_name, status, reviewed_by/at/note, cohort, acquisition_source, invite_id, organisation_id nullable, taking_students, years, qualifications, contact fields + show toggles, video), `provider_members` (user_id, provider_id, role), `provider_terms` (sort_order, detail), `provider_photos`, `testimonials`, `subscriptions` (billing_owner, stripe ids, tier, status, founding flag/price), `invites` (token, email, name, profession, prefill, created_by, cohort, source, expires_at, used_at).
- [ ] RLS by membership everywhere ("is a member of this provider"), never "id = auth.uid()". Public reads gated on `status = 'published'`.
- [ ] Activity: `events` (was clinics; any profession; capacity, places_left), `enquiries` (`want` as text), `favourites` (rider to provider), `rider_alerts` (place, radius, door or professions, terms, kinds wanted, consent source + timestamp, unsubscribed_at), `notifications_log`.
- [ ] Measurement: `provider_events` (impression, view, reveal, enquiry; profession_id; bot/self-view excluded on write), `search_events` (+ profession_id), `provider_month_stats` (frozen monthly), `gsc_daily`.
- [ ] Pages: `indexable_pages` (+ profession_id), `recompute_indexable_pages()` counting per profession.
- [ ] Content: `settings`, `settings_history`, `content_blocks`, `content_history` (history via triggers, same pattern as 0023).
- [ ] Functions: `nearby_providers()`, `riders_for_event()`, `events_for_rider()`, `nearest_postcode()`.
- [ ] Storage buckets: `provider-photos`, `provider-videos`, `term-images` (policies keyed on membership, not uid).
- [ ] Enquiry retention: contact details deleted after 24 months (scheduled job).

Seed and reload:

- [ ] Wipe the database (drop and recreate `public`, clear storage buckets). Run the baseline.
- [ ] Reload postcodes and areas (`supabase/scripts/load-postcodes.mjs`, areas build).
- [ ] Seed the nine professions + `profession_details` from today's code (`professions.ts`, hero copy, glyph keys) so nothing on screen changes.
- [ ] Seed disciplines (parent = Riding coaches), skills, attributes, aliases, suggestions (from 0008), plus each profession's specialities and aliases (from `mock-professionals.ts` SPECIALITIES; shoer, blacksmith, barefoot trimmer, hoof trimmer, equine dentist).
- [ ] Seed settings: founding_join_by, founding_free_until (both 2027-04-30), review_required (true), review_alert_emails, event_reach_km (250), gate numbers (min providers per page 3, featured min 8, featured slots 3), limits.
- [ ] Seed `content_blocks` with today's page copy.
- [ ] Re-grant the two admins; both re-sign up.

Code renamed to match:

- [ ] `src/`: coach→provider wherever it means provider (queries, actions, types, dashboard, events lib, stats lib, structured data, sitemap, SEO digest, notifications). Coach stays where it means a riding coach.
- [ ] `ensureCoachProfile` → provider row + owner membership created at sign-up (§06.2).
- [ ] Middleware: `/dashboard` gate on role provider; slug-history redirects for professions and specialities, not only `/disciplines/`.
- [ ] Smoke scripts and parity/behaviour suites updated to the new names.
- [ ] Rename the settings accessor for founding (`getFoundingOfferEnd` → join-by and free-until).

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
- [ ] Founding: eligibility by sign-up date vs `founding_join_by`; Spotlight free until `founding_free_until`, then Listed at the founding $9.99 Stripe price; cohort founding/open fixed at sign-up.

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
- [ ] Settings: founding dates, review switch, alert emails, event reach, gates, limits.
- [ ] Review queue (count on the tab), Providers list (filter by profession/status/cohort, hide/unhide, source, recent changes), Invites, Riders (counts, unsubscribes, delete on request), Areas (intros per profession).
- [ ] Every save revalidates the pages showing it; history list on every screen.

## 9. Before launch (§12)

- [ ] Terms of service and privacy policy covering every profession: registration numbers and insurance shown as supplied by the provider, never checked by us (solicitor).
- [ ] Mock providers switched off wherever real ones exist.
- [ ] Run the definition-of-done test with a throwaway profession, then delete it.
- [ ] Full route walk, parity suites, nav/home/search behaviour suites, production build.
