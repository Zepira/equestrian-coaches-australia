# Golden Hour redesign — build plan

Written 10 Sep 2026. Source of truth for the redesign work: the Claude Design export in
`.claude/design-export/` (five `.dc.html` canvases plus `support.js` and `assets/`).
This plan turns those canvases into the live Next.js app, page by page, with a
measured parity check at the end of every phase. Tick the boxes here as phases land
and mirror the one-line outcome into `CLAUDE.md`'s build log.

---

## 0. Decisions locked before building

| Decision | Choice | Why |
|---|---|---|
| Homepage direction | **1a Golden Hour** | `Search Results`, `Coach Profile`, `For Coaches` and `Dashboards` are all explicitly built "in the 1a Golden Hour language". 1b/1c are alternates, not shipped. |
| Type | **Instrument Serif** (display, 400 regular + italic) and **Hanken Grotesk** (body, 300–700) via `next/font/google` | Replaces Fraunces + Work Sans. Italic Instrument Serif is the emphasis voice throughout (`<em>` in headings, distances, step numbers). |
| Palette | Unchanged Paddock palette plus two new roles: **peach `#e8b79a`** (italic emphasis and eyebrows on dark) and **deep ink `#14281f`** (hero/footer ground, darker than `--color-ink`) and **card-on-ink `#24463a`** | All three appear in every canvas. |
| Radii | **Pills `999px`, cards `14–22px`, controls `9–12px`** | The flat 2–3px Paddock corners are gone everywhere in the new canvases. This is the single biggest token change. |
| Brand mark | **"ECA" wordmark in Instrument Serif** (26px mobile / 30px desktop header, 40–48px footer) | Replaces the ruled ECA monogram box. Favicon and apple icon regenerated to match. |
| Motion vocabulary | **Only the design's keyframes**: `rise` (word-by-word headline), `fade`, `kb` (Ken Burns), `marquee`, `wordcycle`, `ring`, `bob`, `pop`, `sheet`, `grow`, plus `data-reveal` scroll-in (`.9s cubic-bezier(.16,1,.3,1)`, threshold .12) and `data-parallax` (`translateY(min(scrollY*0.28, 260px))`) | Phase 17/20 extras that the canvases do **not** have are removed: header hide-on-scroll, magnetic buttons, count-up stat, eyebrow underline draw, `.lift`/`.press`. A "perfect match" means matching what is there and not adding what is not. |
| Header | **Three variants, chosen per route**: overlay gradient (home, for-coaches, profile-mobile), solid ink with embedded search summary (search), translucent cream blur (profile-desktop, dashboard, account). Always sticky, never hides. | Straight from the canvases. |
| Search model | Homepage: **location-first** single input + single discipline select + "Did you mean" town chips + live "N nearby" count. Results page: **chip filters + radius slider (25–150 km, step 25) + list/map**. | Skills & setup multi-select dropdowns leave the homepage and become the result-page chips. |
| Map | **MapLibre GL JS + OpenFreeMap vector tiles**, no API key, custom style in the site palette | Canvas says "map placeholder — the build wires it to the PostGIS results". Raster OSM/Leaflet looks like a classifieds site and OSM's tile policy discourages production use; Google/Mapbox need keys and billing. MapLibre is free, vector tiles let the map be styled cream/ink/terracotta to match. MapTiler (keyed, 100k loads/mo free) is the fallback tile host. Decided 10 Sep 2026. |
| Mock coaches | **Kept** | Canvas explicitly keeps "the mock coach roster and the Unsplash discipline set already in the codebase". |
| Uncommitted work in the tree | **Committed first as the baseline** (`for-coaches` copy rewrite, forgot/reset password, location autocomplete, video upload, accordion, `0017_coach_video.sql`) | It builds and lints clean (only the design export's `support.js` trips lint — fixed by ignoring `.claude/**`). Alana commits; nothing here is thrown away — the For Coaches canvas was lifted word-for-word from that page. |

---

## 1. Scope matrix — canvas frame → route

| Canvas | Frame | Route(s) | Status today |
|---|---|---|---|
| ECA Redesign | 1a mobile + desktop | `/` | Rebuild |
| Search Results | mobile + desktop | `/search` (and the same list/card treatment reused on `/disciplines/[slug]`, `/disciplines/[slug]/[area]`, `/riding-instructors/[area]`) | Rebuild |
| Coach Profile | mobile + desktop | `/coaches/[slug]` | Rebuild |
| For Coaches | 2a mobile + 2b desktop | `/for-coaches` | Restyle (copy already matches) |
| Dashboards | 1a/1b coach dashboard | `/dashboard`, `/dashboard/enquiries` (new), `/dashboard/profile`, `/dashboard/clinics`, `/dashboard/billing` | Rebuild |
| Dashboards | 1c/1d rider account | `/account` | Rebuild |
| — (no canvas) | — | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/clinics/[id]`, `/not-found`, `/admin/*`, `/dashboard/clinics/[id]/edit` | Token-level restyle only (§5) |

Design frame widths are **390** (mobile) and **1280** (desktop). Every parity check below is run at exactly those two widths first, then at the wider matrix already used in Phases 16–16f.

---

## 2. Data the canvases assume that the schema doesn't have yet

One migration, `0018_redesign_data.sql`, run before Phase R3. Everything below is a real product feature the canvases render, not decoration.

| Canvas element | Table / column | Notes |
|---|---|---|
| Enquiry inbox, status badges, "Latest enquiries", rider "Enquiries you've sent" | **`enquiries`** — `id`, `coach_id`, `rider_id` (nullable), `rider_name`, `rider_contact` (email or mobile, free text), `want` enum `regular\|one_off\|clinic`, `message`, `status` enum `new\|replied\|booked\|no_response`, `created_at`, `updated_at` | `sendCoachEnquiry` inserts a row **and** emails as today. RLS: coach reads/updates own; rider reads own by `rider_id`; insert via service role only. |
| "Taking new students" switch + green badge | `coach_profiles.taking_students` enum `yes\|waitlist\|no` default `yes` | Also drives the profile CTA copy (canvas: "Waitlist open" / "Not taking students right now"). Add as a `/search` chip filter ("Taking new students"). |
| "travels up to 60 km" | `coach_profiles.travel_radius_km int` (nullable) | Replaces the bare `travels_to_rider` bool in the UI; keep the bool for now, derive it as `travel_radius_km > 0`. Feeds the "Based in X" vs "Travels to X from Y" line on result cards. |
| "7 years coaching" | `coach_profiles.years_coaching int` (nullable) | Optional field on the profile form. |
| Setup tiles with a detail line ("60 × 20 m, all-weather surface") | `coach_terms.detail text` (nullable) | Attributes are already terms; this adds the coach's own one-line detail per attribute. |
| Stats: appeared in search / profile views / tapped to call / enquiries, 12-month trend | **`coach_events`** — `coach_id`, `kind` enum `impression\|view\|reveal`, `created_at`, `visitor_hash` (daily-salted, for dedupe) | Written server-side with the service-role client, same as `search_events`. `impression` is logged per coach id returned by a search (batch insert from `searchCoaches`). `view` on `/coaches/[slug]` render. `reveal` from the phone-reveal action. Enquiries come from the `enquiries` table. "Appeared in search" honestly means **on-site** search until GSC is connected — the dashboard labels it that way. |
| Clinic "6 places left", "142 riders emailed" | `clinics.capacity int` (nullable), `clinics.places_left int` (nullable) | "Riders emailed" already derivable from `notifications_log`. |
| Rider "Coming up near you" | no schema change | `matching_riders_for_clinic()` inverted: clinics whose discipline or coach location matches the rider's `rider_preferences`. New RPC `clinics_for_rider(rider_id)`. |

Tier enum note: `subscription_tier` is still `standard | standard_plus_clinics`. The dashboard canvas shows Listed/Spotlight/Clinic. **Phase R7 adds the three new enum values and maps the two old ones forward** (`standard → listed`, `standard_plus_clinics → clinic`) — this is the migration `0017_coach_video.sql`'s header comment said was owed.

---

## 3. Phases

Every phase ends with the same four gates, then its own checklist:

1. `npm run lint`, `npx tsc --noEmit`, `npm run build` all clean.
2. Console clean (no errors, no hydration warnings in `next start`) on every route the phase touched.
3. Parity screenshots at 390 and 1280 saved to `docs/design-reference/<phase>/` next to the design frame's own screenshot, and the differences written down.
4. Anything not matched is listed in the phase's "Deviations" note — never silently dropped.

### R0 — Baseline, reference captures, and the parity harness

- [x] Add `.claude/**` to `eslint.config.mjs` `globalIgnores`. Delete stale `.next` so `tsc` stops referencing the removed `debug-file-input` page.
- [x] Alana commits the uncommitted work as its own commit ("For coaches copy, password reset, location autocomplete, coach video").
- [x] **Serve `.claude/design-export/` statically and open each canvas in the Browser pane** to confirm the frames actually render (they load React 18 + Babel from unpkg, so this needs network). Capture a screenshot of every frame at its native width, full-page, into `docs/design-reference/frames/`. These are the pictures every later phase is compared against.
- [x] Extract the canvases' data into one place: `docs/design-reference/spec.md` — every font size / line-height / letter-spacing / colour / radius / spacing per element, per frame, per breakpoint, plus every keyframe with its duration, easing and delay. This is a mechanical transcription of the inline styles, and it is what the computed-style assertions in later phases are checked against. Doing it once up front stops each phase re-reading 300 KB of HTML.
- [x] Write `scripts/parity-check.mjs`: given a route, a width and a list of `[selector, property, expectedValue]` triples, opens the running app in the Browser tool flow and reports mismatches. Playwright (dev dependency, Chromium only) drives it so reference captures, computed-style dumps and app checks are repeatable files on disk rather than one-off Browser-pane reads.

**Done 10 Sep 2026.** Playwright (dev dep, Chromium) added. `scripts/design-reference/capture-frames.mjs` serves the export, renders all 16 frames (as designed + unrolled) into `docs/design-reference/frames/` and dumps computed styles into `docs/design-reference/spec/*.json`; `build-spec-md.mjs` renders those into `docs/design-reference/spec.md` (one row per element: y, box, font, colour, bg, radius, animation); `parity-check.mjs` does the same dump + screenshots on the running app and evaluates an assertion file. Fonts confirmed resolved (Instrument Serif / Hanken Grotesk), `rise` delays and 8 `wordcycle` spans confirmed in the JSON. `Current Site.dc.html` deliberately skipped (it is the old site). Known capture artefact: sticky bars inside frames are pinned to their natural position for the unrolled shots.

**Validation:** frames render; reference screenshots exist for all 16 frames; `spec.md` has a row for every text element in the 1a homepage (spot-check ten against the HTML).

### R1 — Tokens, type, brand mark, header, footer

The foundation everything else sits on. Nothing page-specific yet.

- [x] `layout.tsx`: swap fonts to `Instrument_Serif` (weights 400, styles normal+italic) and `Hanken_Grotesk` (300–700). Update `--font-display`/`--font-sans` fallbacks.
- [x] `globals.css` tokens: add `--color-peach: #e8b79a`, `--color-ink-deep: #14281f`, `--color-ink-card: #24463a`, `--color-ink-fg-70/60/50` alpha helpers; replace `--radius-tile/control` with `--radius-pill: 999px`, `--radius-card: 16px`, `--radius-card-lg: 18px`, `--radius-control: 10px`, `--radius-input: 12px`. Add the design's keyframes verbatim. Add `.hs` (hidden scrollbar) utility.
- [x] Remove Phase 17/20 motion that the canvases don't have: `.lift`, `.press`, `.eyebrow-line`, `count-up.tsx`, `magnetic.tsx`, header hide-on-scroll, `ken-burns` (replaced by the design's `kb`). Keep `reveal.tsx` but retune it to the design's exact values (`opacity 0 → 1`, `translateY(20px/24px) → 0`, `.9s cubic-bezier(.16,1,.3,1)`, IO threshold `.12`). Keep `hero-parallax.tsx` but change the factor to `0.28` capped at `260px` and target `[data-parallax]`. Universal `prefers-reduced-motion` reset stays.
- [x] **Wordmark**: delete `monogram.tsx`; new `wordmark.tsx` renders "ECA" in display type at a size prop. Regenerate `src/app/icon.svg` and `apple-icon.png` as the ECA wordmark on `#14281f` (serif fallback in the SVG, checked legible at 32 px).
- [x] **`SiteHeader`** rebuilt with a `variant` prop resolved from the route: `overlay` (gradient `rgba(13,24,18,.55)→0`, cream text, `margin-bottom:-60px/-72px` so the hero starts at y=0 — keep the existing `data-overlay-route` `<html>` background mechanism for iOS), `ink` (solid `#1f3a2e`, search summary slot in the middle), `light` (`rgba(246,241,231,.85)` + `backdrop-filter: blur(10px)` + hairline). Heights 60 / 72. Desktop nav: Find a coach · Disciplines · For coaches · Log in · outlined pill "List your profile" (hover fills cream/ink). Mobile: "Log in" + a 40 px round outlined hamburger. Logged-in: avatar circle + first name (dashboard shows "View profile" pill). Current page gets the peach underline (For Coaches desktop frame).
- [x] **`SiteFooter`** rebuilt: deep-ink ground, ECA 40/48 px, tagline "Equestrian Coaches Australia. The coach who teaches what you ride, wherever you are.", Riders / Coaches / About columns (2-col mobile, `2fr 1fr 1fr 1fr` desktop), © 2026 line. The Journal/Night Arena variants are ignored.
- [x] `Button`/`LinkButton`: variants become `primary` (terracotta, radius 10 or pill per prop), `ink` (solid green), `outline-light` (cream hairline on dark), `outline-ink` (green hairline on light), `link` (underlined, accent or peach). Hover colours from the canvases (`#9c4630`, ink↔terracotta swaps).

**Done 10 Sep 2026.** Old radius names kept as aliases (`--radius-tile` → 16px card, `--radius-control` → 12px input) so every not-yet-rebuilt page picked up the roundness immediately; `--header-h` is now 60px / 72px (was a flat 64px). `Reveal` re-implemented on `[data-reveal]` with the canvas timing; `Parallax` on `[data-parallax]` at 0.28/260px. Favicon + apple icon rendered as PNGs with the real Instrument Serif via `scripts/build-icons.mjs` (a favicon can't load the webfont, so the glyphs are baked). The layout's `<html data-overlay-route>` script moved to `next/script` `beforeInteractive`. `/for-coaches` stays on the light header until R6 gives it a dark hero (an overlay header over a cream page was unreadable in the interim screenshot). Measured with `parity-check.mjs`: **25/25** header/footer assertions at 1280 and **20/20** at 390 on `/`, no console or HTTP errors; `contrast-check.mjs` (new — samples the brightest pixel actually painted behind an element's content box) on the floating header over the hero: wordmark **12.66:1 / 15.99:1**, tagline 11.44:1, nav 14.55:1, "Log in" 11.92:1, outline pill 11.31:1 at 1280 and 12.78:1 at 1600. Route walk at 390 (disciplines, area pages, signup, forgot-password, account, dashboard, search, 404) rendered with no errors except one **dev-only** React warning on the 404 page about a client-rendered `<script>` (pre-existing path; re-checked under `next start` in R9). Lint, tsc, build clean.

**Validation:**
- `getComputedStyle` on `h1`, `body`, and a `.font-display` element resolves to Instrument Serif / Hanken Grotesk (family string contains the name), on `/`, `/search`, `/for-coaches`.
- Header at 390 and 1280 on `/`, `/search`, `/coaches/[mock]`, `/dashboard`: height 60/72, background/gradient, text colour, nav items and their order match `spec.md` rows exactly.
- Footer structure matches: column count per width, link text, copyright.
- Header contrast over the hero re-measured with the canvas scrim (this is now `rgba(13,24,18,.55)` at the top, not the previous plate) — wordmark must clear 4.5:1 against the brightest pixel behind it at 390, 768, 1280, 1920.
- `grep` finds zero remaining references to `monogram`, `magnetic`, `count-up`, `.lift`, `.press`, `eyebrow-line`, `ken-burns`, `--radius-tile`.
- Every route still renders (walk the site map) — this phase changes shared components, so the check is site-wide, not page-specific.

### R2 — Homepage (`/`)

Built from the 1a frames section by section. Mobile hero is height `780px` with the text bottom-anchored; desktop hero `800px` with a `640px` text column vertically centred. Both sit under the overlay header. The existing `hero-wide.jpg` ladder in `public/hero/` is reused (the canvas uses the same asset); `band-*` files and the band entries in `scripts/build-hero-images.mjs` are deleted now — the split layout is gone for good.

- [ ] **Hero**: `[data-parallax]` wrapper `inset:-10%/-12% 0 0 0`, image `object-position: 78% 0%` (mobile) / `80% 50%` (desktop), `kb 14s/16s cubic-bezier(.2,.6,.2,1) both`. Scrims exactly as the canvas (mobile: vertical 5-stop; desktop: horizontal 4-stop + vertical 4-stop). Eyebrow "Riding coaches, Australia-wide" (`fade .8s .1s`). H1 "Find a coach for" as four `rise`-wrapped words at `.15/.22/.29/.36s`, then the **`wordcycle` line** — eight disciplines, italic peach, `16s` loop, `2s` stagger. Lead copy. Glass search card (`rgba(246,241,231,.12)`, hairline, `blur(14px)`, radius 14/16). Mobile only: bobbing `↓`. Desktop only: stat row (19 disciplines · Free for riders · Direct contact, no commission) — `disciplines.length` stays the real number.
- [ ] **Search card** (`search-bar.tsx` rewritten): location input with terracotta dot, `LocationAutocomplete` restyled into the canvas's "Did you mean" chips (max 3, `startsWith` match, town list from `postcodes`/`areas` — not the canvas's hard-coded 24), live **"N nearby"** count once a location resolves (new `GET /api/coach-count?location=&discipline=` backed by `nearby_coaches` with a count-only path; debounced; mock coaches included), discipline `<select>` ("Any discipline" + all disciplines), CTA text switches from "Find a coach" to "Show N near Town". Submit → `/search?location=&d=`.
- [ ] **Discipline marquee**: `marquee 40s/55s linear infinite`, duplicated content for the seamless loop, peach `·` separators, 12 disciplines listed. Pauses under reduced motion.
- [ ] **Featured coaches** (`data-reveal`): eyebrow + "Coaches taking riders *now*" + "See all". Mobile: horizontal snap-scroll of 250 px cards; desktop: 4-up grid, `translateY(-6px)` hover. **`CoachCard` rebuilt**: 4/5 arch photo (`radius 125px 125px 10px 10px` mobile, `999px 999px 12px 12px` desktop), a blurred ink "N km · Town" badge bottom-left, name in display 24/28, discipline line in terracotta 13/500, headline.
- [ ] **By discipline** (ink section): mobile is a divided list (52 px arch thumb, name 22 px, "N coaches", →); desktop is a sticky left column + 2-col photo grid (`aspect 1.25`, radius 14, hover `scale(1.05)`, bottom scrim, name + count). "All 19 disciplines" peach link. **Counts are real**: published coaches + mock coaches per discipline, computed server-side. Old `discipline-masonry.tsx` deleted.
- [ ] **How it works**: three steps, italic terracotta numerals, hairline dividers. Copy from the canvas's `STEPS`.
- [ ] **For coaches CTA**: shade card (`#efe9dc`), radius 16/20, two concentric terracotta hairline circles top-right (desktop), ink pill button (hover terracotta). Copy: "$9.99 a month … No commission, ever."
- [ ] Delete `hero.tsx`'s split-layout CSS blocks in `globals.css`; keep the safe-area work (`--safe-top`, `100dvh`, `viewport-fit=cover`, `<html>` background).

**Validation:**
- Computed-style assertions from `spec.md` for every text element in the hero, featured, discipline, steps and CTA sections at 390 and 1280 (font-family, size, line-height, letter-spacing, colour, weight). Target: zero mismatches; each one found is fixed, not logged.
- Animation assertions via `getComputedStyle(...).animationName/Duration/Delay/TimingFunction`: hero words (`rise`, `.9s/1s`, exact delays), eyebrow/lead/card (`fade`, exact delays), image (`kb`), wordcycle spans (`wordcycle 16s`, delays `.7 + 2n`), marquee (`40s/55s linear infinite`), mobile arrow (`bob`).
- Scroll behaviour: `data-reveal` sections start `opacity:0; translateY(20/24px)` and flip when 12 % visible (read `style` after scrolling each into view); parallax wrapper's inline transform equals `min(scrollY*0.28, 260)` at three scroll positions.
- Wordcycle: sample the visible discipline word at t=1s, 3s, 5s and confirm the sequence dressage → western → liberty.
- Search card: type "Bend" → chips include "Bendigo VIC"; pick it → count appears, CTA reads "Show N near Bendigo"; submit → URL has `location=Bendigo+VIC`. N is checked against a direct `nearby_coaches` count + mock count.
- Side-by-side screenshot of hero, featured, discipline and CTA sections vs the reference frames at both widths; horse position and text column edges within a few px.
- Contrast re-measured on the new scrims: eyebrow, h1, lead, stat row, all ≥ 4.5:1 worst-case pixel.
- Viewport matrix from Phase 16 re-run (no text/horse collision, no horizontal scroll, search card above the fold at 320×568).
- Reduced motion: every animation resolves to ≤ 0.01 ms; wordcycle shows a single static word; marquee static; content fully visible. No-JS: `.reveal` content visible via the `<noscript>` override.
- LCP is still the hero `<img>` with `fetchpriority="high"`; only one hero image fetched.

### R3 — Data layer for the new product surfaces

Migration + server code only; no UI. Done before the pages that need it.

- [ ] `0018_redesign_data.sql` per §2 (`enquiries`, `coach_events`, `taking_students`, `travel_radius_km`, `years_coaching`, `coach_terms.detail`, `clinics.capacity/places_left`, `clinics_for_rider()` RPC). Run against the live DB via the pooler script pattern in `CLAUDE.md`, immediately.
- [ ] `sendCoachEnquiry` writes an `enquiries` row (status `new`) before emailing; accepts `want` and the combined contact field; attaches `rider_id` when logged in.
- [ ] `lib/coach-events.ts`: `logImpressions(coachIds)`, `logView(coachId)`, `logReveal(coachId)` — service-role, never throw, daily-salted visitor hash from IP+UA for dedupe. Wire `logImpressions` into `searchCoaches`, `logView` into `/coaches/[slug]`, `logReveal` into a new `revealPhone` server action (which is what makes click-to-reveal real: the number is **not** in the initial HTML, it is fetched on click).
- [ ] `lib/coach-stats.ts`: `monthStats(coachId, month)` → impressions/views/reveals/enquiries with deltas vs the previous month; `twelveMonthViews(coachId)`; `profileCompleteness(coach)` (photo, bio, disciplines, location, three testimonials, video).
- [ ] Mock coaches gain `takingStudents`, `travelRadiusKm`, `yearsCoaching`, `setup` details, and a `where` line, so the search and profile canvases can be exercised with them.
- [ ] `/search` filters: chips map to `taking_students = 'yes'` and the existing attribute terms (`horses-available`, `online-lessons`, `beginners-welcome`, `indoor-arena`, `weekend-availability` — confirm the exact slugs in `0008`, add any missing ones as attribute terms in `0018`).

**Validation:** migration confirmed via `information_schema`; a throwaway coach + rider exercise every new write path (enquiry → row + log line; view/reveal/impression → `coach_events` rows with dedupe proven by repeating the same request); `monthStats` returns the right counts read straight back from SQL; `clinics_for_rider` returns the expected clinic for a rider with matching preferences and nothing for one without; RLS checked as the anon key (cannot read `enquiries`, cannot insert `coach_events`). Throwaways deleted after.

### R4 — Search results (`/search` and the three listing routes)

- [ ] **Ink header variant** with the search summary pill ("Bendigo VIC · Dressage · within 50 km" + "Edit"). "Edit" opens the homepage search card in a sheet (mobile) / inline popover (desktop) pre-filled — reusing the R2 component.
- [ ] Mobile: chips row under the header (horizontal scroll, `.hs`), "N coaches" h1 + "Nearest first", "Within N km of Town", radius `<input type=range>` (accent terracotta), card list, "Nobody quite right?" ink card with "Notify me" (→ `/account#alerts` with the search's location and discipline pre-filled, or `/signup?role=rider&next=…` when logged out). **Floating list/map toggle** pill, sticky bottom, ink with a peach dot.
- [ ] Desktop: chips row + radius slider on the right; h1 "N coaches *near Town*"; **2-column card grid**; **map column pinned right at 480 px**, `sticky top:72px`.
- [ ] **Result card** (`coach-result-card.tsx`): 104/110 px arch thumb, name + italic terracotta "N km", discipline line, **"Based in X" / "Travels to X from Y"** line (from `travel_radius_km` + distance vs the coach's own area), 2-line clamped headline, attribute tag pills. Active card gets a terracotta border when its pin is selected; hovering a card selects its pin.
- [ ] **Map** (`coach-map.tsx`, client, dynamic-imported with SSR off): MapLibre GL + OpenFreeMap vector tiles with a custom style (cream ground, tint roads, ink labels), dashed terracotta radius circle, pulsing `ring` origin dot, one **"N km" pill marker per coach** (ink, terracotta when active, `pop` on mount), active-coach card overlay at the bottom (`fade`). Mobile map view is the full frame below the header. Mock coaches have real lat/long already so they plot.
- [ ] Radius change re-queries in place (URL param `r`, default 50) and animates the circle.
- [ ] The three SEO listing routes swap their card component for the new result card and adopt the light header variant; they do **not** get the map or chips (they are static, indexable pages — keep them simple).
- [ ] `search-facets.tsx` and `pill-dropdown.tsx` retired once nothing imports them.

**Validation:**
- Computed-style assertions from `spec.md` for header pill, chips (on/off states), h1, card typography, tag pills, map overlay card, toggle pill, at 390 and 1280.
- Functional: each chip toggles a URL param and the result count changes accordingly (checked against a direct RPC call with the same filters); radius 25→150 changes count monotonically; toggle switches list↔map and back without losing scroll or filters; clicking a pin selects the card (border colour read via computed style) and vice versa on hover.
- Map: correct number of markers equals result count; the origin dot sits at the resolved location's lat/long (read marker positions back through MapLibre's API); tiles load (network requests to `tiles.openfreemap.org` return 200); no console errors from the SSR guard.
- "Based in / Travels to" line is right for a throwaway coach placed 30 km away with a 60 km radius vs one with a 10 km radius (the latter must not appear at all — radius respected).
- Screenshots vs reference at both widths in list and map states.
- `search_events` still logs; `coach_events.impression` rows appear for each result.
- Keyboard: chips, slider, toggle, cards all reachable and operable; slider has a label.

### R5 — Coach profile (`/coaches/[slug]`)

- [ ] **Mobile**: overlay header with "← Results" (back to the referring search when there is one, else `/search`) and a round favourite button (♡/♥, peach when saved) — `FavouriteButton` restyled and moved into the header slot. 440 px photo with `kb 10s` and the four-stop fade into cream; content pulls up `-56px`. Status pill (green dot "Taking new students" / "Waitlist open" / "Not taking students right now"), name 46 px, "Based in **Town** · travels up to N km · N years coaching", discipline pills (primary = terracotta outline), headline 24 px display, bio, "What she helps with" skill pills, "Setup" 2-col shade tiles with italic terracotta key + detail, "Qualifications" dashed list, ink testimonials band (h2 "What riders *say*", horizontal snap cards `#24463a` with the big peach quote mark), "Upcoming clinic" date-block card, "Get in touch" + **click-to-reveal phone** (button → `revealPhone` action → number swaps in), and the **sticky enquiry bar** ("Enquire with Name" · "Free · no account needed") that opens the **bottom sheet** (`sheet .45s`, scrim `fade .3s`, drag handle, Close) containing the enquiry form.
- [ ] **Desktop**: light header with "← Back to results"; `1fr 400px` grid; 300 px arch portrait beside the name block (name on two lines at 68 px), "Save to favourites" outlined pill; headline 32 px; two-column skills+qualifications / setup; ink testimonials card 3-up; clinic row with "Details →"; **sticky aside** enquiry card (`top:96px`, shadow) with "Prefer to call?" + reveal.
- [ ] **Enquiry form** (`contact-form.tsx` rewritten, shared by sheet and aside): Your name, Email or mobile, want chips (Regular lessons / One-off / Clinic — single select), message, "Send enquiry", "Goes straight to Name. We never share your details." Success state replaces the form in place. Disabled with the canvas's copy when `taking_students = 'no'`.
- [ ] Pronouns: the canvas says "What she helps with" / "From her riders". Add `coach_profiles.pronoun_set` is **not** in §2 on purpose — use the coach's name ("What Isabella helps with", "From Isabella's riders") so nothing is guessed.
- [ ] Structured data (`Person`, breadcrumbs) untouched; `knowsAbout` gains nothing new.

**Validation:**
- Computed-style assertions from `spec.md` for every element listed above, both widths.
- Photo: `kb` animation present, fade gradient stops read back, mobile content overlap of exactly 56 px.
- Sticky bar: stays at the bottom through a full-page scroll; tapping it mounts the sheet with `animation-name: sheet`; scrim click and Close both unmount it; body scroll locked while open; focus moves into the sheet and returns on close.
- Phone reveal: initial HTML (`view-source` via fetch) does **not** contain the number; clicking fetches it; a `coach_events.reveal` row appears once for repeated clicks.
- Enquiry: submit from the sheet and from the aside → `enquiries` row with the right `want`, and the log/email line; success copy shown; a coach with `taking_students = 'no'` shows the disabled copy and the action refuses a direct POST.
- Favourite: heart flips without reload in both header (mobile) and button (desktop) placements; row in `favourites`.
- Mock coach: renders every section with mock data, no contact leak, enquiry logs to the `mock:` sentinel path as today.
- Screenshots vs reference, both widths, including sheet-open state.
- Keyboard + screen reader: sheet is `role=dialog` with a label; reveal button announces the number; skills/setup are lists.

### R6 — For coaches (`/for-coaches`)

Copy is already right (the canvas was lifted from the current page). This is a restyle plus the hero and marquee.

- [ ] Hero: full-bleed photo (canvas uses Unsplash `photo-1598974357801-cbca100e65d3`; download the master to `assets/hero/for-coaches.jpg` and run the ladder script — Unsplash licence, same as the mock set), 700/720 px, `kb`, parallax, canvas scrims, eyebrow, **seven `rise` words with "exactly" italic peach**, lead, two CTAs (terracotta "Join as a founding coach" → `/signup?role=coach`, outlined "See what's included" → `#included`).
- [ ] Uppercase marquee strip with peach dots (`45s/60s`).
- [ ] Founding section: deep-ink with the second Unsplash photo at `.35/.4` opacity + gradient; desktop pairs it with the monthly-email card in a 2-col grid.
- [ ] Monthly email card restyled (`monthly-email-example.tsx`): shade header row, subject, 2×2 / 4-up stat tiles, body copy, shade footer.
- [ ] "What we actually do" ink section: sticky left heading on desktop, numbered italic-peach list.
- [ ] Plans: Monthly/Yearly toggle pill (`Yearly · save two months` on desktop), three tier cards (Spotlight featured = ink card, "Most popular" peach label, terracotta button; others cream with ink outline button), desktop hover `translateY(-6px)`. Prices from the tier constants (until the `settings` table exists — noted in §6).
- [ ] Comparison: desktop full table with the Spotlight column tinted; mobile collapses it behind "Full comparison, all N features" (+/−).
- [ ] "We never take a *percentage* of a lesson." band. FAQ with the `Accordion` restyled to the round +/− control, one open at a time, first open by default; "Tell us what to fix" shade card (sticky left on desktop).

**Validation:** computed-style assertions; `rise` delays on the seven hero words; marquee timing; toggle flips every price and the alt line ("a year · or $9.99/mo"); comparison row count equals `EVERY + SPOT + CLINIC` (27) and the collapsed state hides it on mobile only; FAQ open/close and `aria-expanded`; both CTAs resolve to real routes; screenshots vs reference; contrast on the hero and founding sections re-measured; reduced motion.

### R7 — Coach dashboard (`/dashboard/*`)

- [ ] Light header variant with "View public profile" pill + avatar (coach's photo or initial) + first name.
- [ ] Navigation: mobile is a horizontal tab row under the header (terracotta underline on the active tab, red badge with the new-enquiry count); desktop is a 200 px sticky left rail with a plan card and the "Tell Kim or Alana" note. Routes stay real (`/dashboard`, `/dashboard/enquiries`, `/dashboard/profile`, `/dashboard/clinics`, `/dashboard/billing`) — tabs are links, not client state, so deep links and back/forward work. `fade .5s` on each panel's content.
- [ ] **Overview**: "August 2026 · your month so far" label, greeting ("Good month, Name." / "A quiet month, Name." chosen from the numbers), summary line built from real stats (top queries only once GSC is connected — until then the line uses reveals/enquiries deltas), four stat tiles with deltas, ink **12-month bar chart** (`grow .7s`, current month peach), "Taking new students?" segmented control (server action, optimistic), latest 3 enquiries, profile completeness bar + checklist with "Add" links, plan card. Desktop layout per the frame (`1.5fr 1fr` rows, "Next clinic" card).
- [ ] **Enquiries**: mobile cards / desktop table; status pill cycles New → Replied → Booked → No response via a server action; "Reply by email" is a `mailto:` with the rider's contact and a subject line.
- [ ] **Profile** (`profile-form.tsx` reshaped, actions unchanged where possible): sticky arch photo + "Change photo" (existing upload flow), Headline, Bio, discipline chips (keeps the R9f drag-to-reorder list beneath — the canvas's "first one leads your page title" note is the same rule), Based in (autocomplete) + Travels up to (km), "Contact riders see" **toggle switches**, Discard/Save. Skills, setup (+ detail), qualifications, testimonials and video sections keep their existing controls restyled with the new inputs — they are below the fold in the canvas's scroll, not absent.
- [ ] **Clinics**: cards with the date block, "N places left", "N riders emailed", Edit / View page; "+ New clinic" terracotta pill; note line varies with tier.
- [ ] **Billing**: ink plan card ("Founding coach" label, plan name, billing line, Next charge / Card tiles), Change plan option list (server action → Stripe/mock), Invoices + Update card (Customer Portal / mock), one-line cancel. Tier enum migration (`listed|spotlight|clinic`, old values mapped) lands here.

**Validation:** computed-style assertions at both widths on every panel; badge count equals `enquiries.status = 'new'` count; stat tiles equal `monthStats` read back from SQL for a throwaway coach with seeded `coach_events`; bar heights are proportional to the seeded 12-month counts; taking-students switch persists (read the row) and the public profile badge changes; enquiry status cycle persists; profile save round-trips every new field; billing plan change writes the right tier in mock mode; `robots: noindex` intact; screenshots vs reference; keyboard operability of tabs, segmented control, switches.

### R8 — Rider account (`/account`)

- [ ] Light header with initial-avatar + name. "My account" eyebrow, "Hello, Name", "Free, always…" line.
- [ ] Saved coaches: cards with arch thumb, name, where, tags, ♥ remove (existing action); dashed empty state with "Browse coaches".
- [ ] Clinic alerts card: "My area" (autocomplete) + "Disciplines I follow" chips + "Save alerts" — the existing preferences action, restyled.
- [ ] "Coming up near you": `clinics_for_rider` results as date-block rows (ink card on desktop).
- [ ] "Enquiries you've sent": from `enquiries` by `rider_id`, status pill (Replied / Awaiting reply mapped from the coach's status).
- [ ] Links: Email & password, Sign out, Delete my account (delete goes to a confirm page; it is the one destructive action and stays behind a confirmation).

**Validation:** computed styles both widths; favourites add/remove round-trip; alerts save round-trip (row read back, geocoded point present); "Coming up near you" shows a seeded matching clinic and hides a non-matching one; sent enquiries list shows the row created in R5's test; screenshots vs reference.

### R9 — Everything without a canvas, then the whole-site sweep

- [ ] `/login`, `/signup`, `/forgot-password`, `/reset-password`: light header, display headings, new inputs (12 px radius, hairline, terracotta focus), pill buttons. No layout change.
- [ ] `/clinics/[id]`: light header, date block, organiser card, the profile's enquiry aside reused for "Ask about this clinic" (`want = clinic` pre-selected).
- [ ] `/disciplines/[slug]` and the area pages: hero-less; display h1 with the italic emphasis pattern, R4 result cards, footer.
- [ ] `/not-found`, `/admin/*`, `/dashboard/clinics/[id]/edit`: token inheritance only, checked for anything that broke when the radii and fonts changed.
- [ ] `metadata` descriptions unchanged; `sitemap`, `robots`, structured data re-verified.
- [ ] `CLAUDE.md`: Phase 10's Paddock token notes updated to point here; Phases 17/20 marked superseded; a new "Phase 21 — Golden Hour redesign" entry summarising R0–R9 with what was measured.

**Validation (whole site):**
- Walk every route in the site map at 390 and 1280 with console open: zero errors, zero hydration warnings under `next start`.
- `grep` for any surviving raw hex colour, `font-bold` on a display heading (the canvases use weight 400 everywhere), `rounded-[var(--radius-tile)]`, or Fraunces/Work Sans reference in `src/`.
- Full viewport matrix (320×568 … 2560×1440) on `/`, `/search`, `/coaches/[slug]`, `/for-coaches`: no horizontal scroll, no text/subject collision, header legible.
- Reduced-motion pass and no-JS pass on every public route.
- Lighthouse-style checks by hand: LCP element on `/` and `/for-coaches` is the hero image; total hero payload under 200 KB; fonts `display: swap`.
- Accessibility: every interactive control keyboard-reachable; sheet/dialog focus trapped; colour contrast on every new dark surface measured (peach on `#1f3a2e` for 13 px text is the tight one — it must clear 4.5:1 or the size goes up).
- Final side-by-side gallery: `docs/design-reference/final/` with app vs frame for all 16 frames, and a written list of every remaining deviation with the reason.

---

## 4. Parity harness (how "perfect match" is proved, not eyeballed)

1. **Reference frames** — R0 captures every canvas frame once. They are the target images.
2. **`spec.md`** — R0 transcribes every element's styles and every animation's timing from the canvases into tables keyed by `frame › section › element`. A build phase copies its rows into the phase's assertion list.
3. **Computed-style assertions** — for each row: open the route at the frame width in the Browser pane, `getComputedStyle` the element, compare. Font sizes and spacing must match to the pixel at 390 and 1280 (the frames are fixed-width, so there is no fluid-type ambiguity at exactly those widths). Colours compare as resolved `rgb()`/`rgba()`.
4. **Animation assertions** — `animationName`, `animationDuration`, `animationDelay`, `animationTimingFunction`, `animationIterationCount` read back per element; scroll-driven effects checked by scrolling to known offsets and reading inline transforms.
5. **Behaviour assertions** — every interaction the canvas scripts implement (`renderVals`/`setState` logic) has a matching check: what the canvas does on that click is what the app does on that click, with the state read back from the DB where the app persists it.
6. **Side-by-side screenshots** — saved per phase; differences written into the phase's "Deviations" note.
7. **The standing rule from every earlier phase** — read the actual DB row back; a green UI is not proof.

---

## 5. Deliberate deviations from the canvases (known up front)

- **Stats copy** — "412 appeared in search / 38 profile views" are canvas figures. The app shows real numbers, and "Appeared in search" is labelled as on-site search until Google Search Console is connected (blocked on the manual GCP step in `CLAUDE.md`).
- **Discipline counts** — the canvas hard-codes `count: 9` etc. The app computes real counts (published + mock).
- **Town suggestions** — the canvas uses a 24-town list; the app uses the real postcode/area data via the existing autocomplete API.
- **Testimonials** — canvas placeholders; the app renders real `testimonials` rows and hides the section when there are none (never an empty band).
- **Pronouns** — canvas headings say "she/her"; the app uses the coach's first name instead of guessing.
- **Map** — canvas is a placeholder; the app plots real PostGIS results on OSM tiles.
- **Dashboard tabs** — canvas uses client state; the app uses real routes so links, refresh and back/forward work. Visually identical.
- **Delete my account** — the canvas is a bare link; the app confirms first.
- **Pages without a canvas** (§1 last row) get the tokens and the header/footer, nothing invented.

---

## 6. Open items for Alana (none block starting R0–R2)

1. **Commit the current uncommitted work** before R0 lands, or say if any of it should not ship.
2. ~~Map provider~~ — decided: MapLibre + OpenFreeMap.
3. ~~Hero photo~~ — decided: Unsplash (free licence) for all site photography, masters downloaded and laddered, never hotlinked for heroes.
4. **Prices** stay in code constants until the `settings` table from the "Configuration over hardcoding" rule is built — that is its own phase and is not part of this redesign.
5. **Tier enum rename** (`standard → listed`, `standard_plus_clinics → clinic`) lands in R7. Any coach rows created in testing before then are mapped forward automatically.
