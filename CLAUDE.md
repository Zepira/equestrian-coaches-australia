# Equestrian Coaches Australia

## What this is

A new online marketplace/directory business connecting riders with riding coaches and instructors across Australia. Riders search by discipline and location; coaches create paid profiles to be found. Think a niche, higher-style version of a classifieds/directory site — closer in spirit to [Horse Deals](https://www.horsedeals.com.au/) functionally, but with a more premium, editorial design treatment rather than a classifieds look.

This is a pre-launch venture — no existing site, brand assets, or codebase yet. This file (and this Cowork project folder) is the source of truth for the concept as it develops.

## Core concept

- **For riders:** search and browse coaches by discipline and location, free to use. No login required to browse (assume optional accounts for saving favourites/notifications later).
- **For coaches:** pay a monthly subscription to list a profile. Coaches upload their own info — description/bio, photo, location, specialties, qualifications, testimonials — and tag themselves under one or more discipline categories.
- **Matching model:** riders find "the perfect coach in the exact discipline they're looking for" — the whole value proposition rests on precise discipline + location filtering, not a generic instructor list.

## Two-sided marketplace, one-sided pricing

- **Riders:** free, always. No revenue from the rider side at launch.
- **Coaches — two tiers:**
  - **Standard listing — $9.99/month AUD.** Profile with bio, photo, location, specialties, qualifications, testimonials, discipline category tags.
  - **Standard + Clinics/Events — $14.95/month AUD.** Everything in Standard, plus the ability to list clinics and events (e.g. a coach hosting a weekend dressage clinic).
- Pricing is indicative/target pricing for launch, not yet finalised or tested with real coaches.

## Discipline categories (launch scope)

Coaches tag their profile with the discipline(s) they teach so riders can filter accurately. Named examples so far: **Western, Dressage, Liberty**. This list is expected to grow (e.g. showjumping, eventing, campdrafting, natural horsemanship, pony club, para-equestrian) — the category taxonomy should be built to be extensible, not hard-coded to 3.

## Search & discovery

Primary rider use case: *"find a dressage instructor near me"* → see all coaches in that discipline, ranked/filtered by proximity. So the search experience needs, at minimum:
- Filter by discipline (multi-select ideally, since coaches can teach more than one)
- Location-based search (postcode/suburb/region, with a "near me" or radius option)
- Coach profile cards showing enough to compare at a glance: photo, name, discipline tags, location, and probably a headline/short bio snippet

## Notifications (aspirational feature, not launch-critical)

Ideally riders can opt in to notifications like: *"Jane Smith is hosting a dressage clinic in your area."* This implies:
- Riders need some way to express "my area" and "my disciplines of interest" (even without a full account system) for this to be targetable
- Ties directly to the $14.95 coach tier, since only those coaches can post clinics/events
- Treat as a v1.x/v2 feature to design around, not necessarily to build first

## Roadmap beyond coaches

The long-term vision is broader than riding coaches — the plan is to eventually expand the same directory/marketplace model to adjacent equine service providers: **bodyworkers, equine chiropractors, farriers**, etc. Implication for design/architecture: the category and profile system should be modelled generically enough (e.g. "service provider" as a concept, with "riding coach" as the first provider type) that new provider types can be added later without a rebuild. Launch scope is riding coaches only — do not build out the other provider types yet, just don't design it into a corner.

## Competitive reference

- **[Horse Deals](https://www.horsedeals.com.au/)** — Australia's long-running equestrian classifieds marketplace (since 1986, now online). Cited by the client as the closest functional comparison (marketplace/classifieds mechanics, equestrian audience) but the brief explicitly wants **more style/polish** than Horse Deals' current look — a more premium, editorial feel rather than a classifieds aesthetic.

## Design direction (from initial brief discussion)

- Feel: **premium & editorial**, blended with **warm & community-led** — polished and aspirational, but still approachable and about real people (coaches and riders), not cold or corporate.
- Audience: two distinct groups — riders (browsing/searching, free, casual) and coaches (professionals managing a paid profile, want to look credible and be found). Skews adult, likely majority female, broad age range across the recreational-to-competitive riding community.
- No existing brand assets (logo, colours, fonts) yet — this is being defined through the design exploration process.
- Working toward: 5 distinct visual directions generated via Claude Design, to compare and choose from before committing to a build.

## Competitive landscape (research done 27 Aug 2026)

Full writeup: `Competitor-Landscape.docx` in this folder. Headline findings:

- **No direct competitor exists** — nobody in Australia runs a dedicated, subscription-based, cross-discipline coach directory. The opportunity is real.
- **Equestrian Australia (EA) "Coach Finder"** is the official governing-body register — free, trusted, but only lists EA-accredited coaches and skews to FEI/Olympic disciplines (dressage, jumping, eventing, para). Western, Liberty and similar disciplines generally fall outside EA's accreditation pathway — a real gap ECA can fill without needing to compete with EA's authority directly.
- **EquiDirectory.com.au** is the closest functional match: a 50+ category general equine business directory that already has a "Coaching / Riding Lessons" category, plus real estate/breeding/saddlery categories that already prove out the "expand beyond coaches later" instinct. It monetises via ad-hoc per-listing/per-year fees ($80–$400 range) rather than a clean subscription, and its design is dated/cluttered — both are openings for ECA.
- **Horse Deals and MyAusHorse** both bolt a generic "business directory" onto their classifieds, with coaching as one category among many (not a dedicated searchable profile experience).
- **Pony Club Australia** is youth/club-focused with volunteer instructors — adjacent, not competing.
- Booking/scheduling SaaS (Vagaro, Bookeo, etc.) are back-office tools some coaches may already use — worth a future booking integration, not a discovery competitor.
- Differentiation to lean into: no gatekeeping by discipline/accreditation, a product wholly dedicated to coach discovery (not one category of many), flat simple pricing, materially better design/craft, and clinic/event notifications as a paid-tier feature nobody else offers.

## Payments & billing (research done 27 Aug 2026)

Build platform decision: custom-coded (via Claude Code), not a no-code site builder — so any payment provider with a proper API/SDK works. This was checked against Wix/Squarespace (27 Aug 2026) and confirmed: the product needs self-serve coach-editable profiles, structured discipline+location search across many listings, and feature-gated subscription tiers — a combination neither builder handles natively (Squarespace's Member Areas only gate whole pages/content by plan, not fine-grained features; Wix could technically get there via its Velo custom-code layer, but that's writing real code inside a platform with its own data/hosting ceilings and lock-in, not a no-code shortcut). Custom code wins on all three of quickest/cheapest/most flexible for this specific product shape — see chat for the full reasoning. Wix/Squarespace would still be the fast, cheap right answer for a simple waitlist/landing page if one's wanted before the full app is ready.

Money only flows one direction at launch: coach → platform (the $9.99/$14.95 monthly subscription). Riders never pay, so there's no need for split/marketplace payouts (Stripe Connect etc.) yet — plain recurring subscription billing is enough. Revisit this only if a future feature has riders paying coaches directly through the platform.

Recommendation: **Stripe** (Checkout + Subscriptions/Billing + Customer Portal), for AUD-native support, cheapest domestic-card rate of the options compared, and by far the best-documented option for an AI-assisted custom build (Customer Portal gives free self-serve plan management/cancellation, so it doesn't need to be hand-built).

Fee snapshot per provider (approx. cost on a $9.99 charge, AU domestic card unless noted):

- Stripe: 1.7% + A$0.30 domestic card (confirmed effective 1 Oct 2026 per Stripe's AU pricing page) ≈ $0.47 (~4.7% of a $9.99 charge)
- Square: 2.2% flat, no fixed fee ≈ $0.22 (~2.2%) — actually cheaper than Stripe at this low ticket size specifically because there's no fixed per-transaction fee, though Stripe's docs/SDKs and Customer Portal are the bigger factor for build speed
- GoCardless (BECS direct debit): 1% + $0.40 (capped $4) ≈ $0.50 (~5%) — bank debit clears in 2–3 business days, so provisioning logic needs to account for delayed confirmation, not instant like a card
- Paddle / Lemon Squeezy (Merchant of Record): 5% + $0.50 ≈ $1.00 (~10%) — much pricier per-transaction, but they become the legal seller and handle all sales-tax/GST compliance for you; worth revisiting if/when expanding beyond Australia

Important regulatory note: the RBA's card surcharge ban takes effect 1 October 2026 (eftpos/Mastercard/Visa) — you will not be able to pass the processing fee back to coaches as a checkout surcharge, so whichever provider's fee applies comes straight out of the $9.99/$14.95 revenue. Factor that into margin, not into pricing display.

GST: flag to an accountant/bookkeeper before launch — Stripe Tax exists to automate this (percentage or flat per-transaction cost) but for a single-country, single 10%-rate business it may be simpler to just build the 10% GST into the listed price manually rather than pay for Stripe Tax at this stage.

## Tech stack (decided 27 Aug 2026, hosting revised 28 Aug 2026)

- **Frontend:** Next.js (React) — not a plain client-side React SPA, specifically because coach profile pages need to be server-rendered/crawlable for Google to index "dressage coach near [suburb]" style searches, which is a real organic acquisition channel for riders.
- **Hosting:** **Vercel** — reversing the earlier 27 Aug Cloudflare Pages decision. Vercel is Next.js's native platform (zero-config deploys, no community adapter needed), and this project already has Vercel tooling/skills wired into the build environment. The commercial-use restriction on Vercel's free Hobby tier (noted in the original 27 Aug research) means launch will need at least the Pro plan (~US$20/mo) once the site is live and monetising — budget for that from day one rather than treating it as a "later" upgrade. Cloudflare Pages remains a fallback if Vercel cost/limits ever become a problem.
- **Backend/DB/Auth/Storage:** Supabase (their existing tool of choice) — Postgres with the **PostGIS** extension enabled for real "coaches within X km" radius search, built-in Auth with row-level security for separate coach/rider accounts, Storage for profile photos, Edge Functions for Stripe webhook handling. **Free tier ($0/mo) is genuinely fine at launch**: 500MB DB, 50k monthly active users, 1GB file storage, 5GB egress — no commercial-use restriction, only resource caps and a pause after 1 week with zero activity (a non-issue once real users are hitting it). Compress/resize coach photos on upload (e.g. ~800px wide) to make the 1GB storage cap stretch to thousands of profiles. Upgrade to Pro (US$25/mo) only when nearing these limits — a handful of paying coaches already covers that.
- **Payments:** Stripe (see Payments & billing section above).
- **Geo search implementation note:** don't pay for a geocoding API on every search — Australia has free/cheap static postcode-to-lat/long datasets (e.g. via data.gov.au) that can be loaded once into a lookup table, then PostGIS handles the radius query.
- **Notifications:** Real push notifications without an app store install ARE possible — Web Push via a installable PWA (web app manifest + service worker) — but iOS Safari only delivers push to a PWA a user has manually "Added to Home Screen"; it does not work for a normal browser tab visit, and there's no workaround (Apple platform restriction). Given most riders won't proactively install anything, plan email as the reliable primary notification channel (e.g. via Resend/Postmark, cheap transactional email) with web push as a bonus layer for engaged users who do install it. Revisit a native app only if real usage data shows push adoption/demand justifies the extra build and app-store overhead.
- **Estimated infra cost:** **~US$20/month to start** (Vercel Pro, required for commercial use) + Supabase free tier ($0/mo until traffic/storage nears its limits) + a ~$15–20/year domain + Stripe's per-transaction fees only (which scale with actual revenue). Upgrade Supabase to Pro (US$25/mo) only once nearing its free-tier limits — by which point coach subscriptions already cover it many times over.

## Auth: Clerk vs Supabase Auth (assessed 27 Aug 2026)

Claude Code suggested Clerk during the build. Assessed and decided: **stick with Supabase Auth**, not Clerk, at this stage.

- Supabase Auth costs nothing extra — it's already bundled into the Supabase plan we're already on (free tier now, Pro later), and it's natively wired into the same Postgres row-level-security rules the rest of the app needs, so there's no second identity system to keep in sync.
- Clerk's free tier (50,000 monthly retained users) explicitly excludes MFA, passkeys, and — the one that matters most here — **removing Clerk's own branding** from the sign-in/sign-up screens. Getting an unbranded auth experience that matches the premium design work means Clerk's Pro plan, US$20–25/month minimum, plus $0.02 per additional user beyond 50k (vs Supabase's own $0.00325/MAU overage — about 6x pricier per extra user).
- Confirmed via Supabase's own docs/blog: if Clerk were ever used, Supabase does support it as an official "third-party auth" provider (Clerk issues the JWT, Supabase trusts it directly for RLS — a real, supported integration, not a hack) and doesn't double-charge Supabase-side auth fees on top of Clerk's own subscription. So the integration itself isn't the problem — the cost is paying Clerk at all for what Supabase Auth already does for free.
- Clerk's genuine advantages (prebuilt polished components, passkey/WebAuthn support, an "Organizations" primitive for a future multi-coach "riding school" account type) are real, just not worth $20–25/mo yet: the components need custom restyling either way to match the chosen design direction, and Supabase Auth already includes MFA (TOTP) for free.
- Revisit Clerk specifically if: passkey login becomes a priority, a multi-seat "organization" account type is needed, or hand-building/maintaining auth screens becomes a genuine recurring time sink.

## App build (started 28 Aug 2026)

The real app is being built ahead of a chosen visual direction, skinned generically so a direction can be applied as a design-token swap later. Full plan lives in this session's approved plan (repo root is now the Next.js app; the design deck moved to `design-preview/`, still live via a `gh-pages` branch). MVP scope: rider search/browse, coach profile CRUD, Stripe subscription billing (both tiers), clinics/events full CRUD, rider accounts with favourites + clinic email notifications — mobile-first throughout.

Build phases: 1 Scaffold, 2 Data+Auth (Supabase), 3 Coach profile CRUD, 4 Search & discovery, 5 Payments (Stripe), 6 Clinics + notifications (Resend), 7 Rider account, 8 Polish/SEO/QA.

- [x] **Phase 1 — Scaffold:** Next.js (App Router, TS, Tailwind v4) at repo root; generic CSS-variable design tokens in `src/app/globals.css` (neutral warm palette, swap when a direction is chosen); base layout with mobile-first header (hamburger nav) + footer; placeholder discipline/coach data (`src/lib/`) standing in for Supabase tables; UI-only pages for the full site map (home, search, discipline pages, coach profile, for-coaches/pricing, login/signup, rider account, coach dashboard incl. profile/clinics/billing tabs) — no backend wired yet.
- [ ] **Phase 2 — Data + Auth:** Supabase project, schema migration, RLS, Supabase Auth wired into the forms already built.
- [ ] **Phase 3 — Coach profile CRUD:** wire `/dashboard/profile` to Supabase + Storage for real photo upload.
- [ ] **Phase 4 — Search & discovery:** postcode lookup + PostGIS radius search replacing the placeholder filter in `/search`.
- [ ] **Phase 5 — Payments:** Stripe products/prices, Checkout, webhook handler, `/dashboard/billing` wired to the Customer Portal.
- [ ] **Phase 6 — Clinics + notifications:** wire `/dashboard/clinics`, Resend integration, cron matcher job.
- [ ] **Phase 7 — Rider account:** favourites + preferences wired to Supabase in `/account`.
- [ ] **Phase 8 — Polish/SEO/QA:** metadata, sitemap, accessibility and cross-device QA pass.

## Status / next steps

- [ ] Review 5 Claude Design directions and choose one (or graft favourite elements together)
- [ ] Lock in brand assets (logo, palette, type) from the chosen direction — apply to the app's design tokens once decided
- [ ] Firm up real hero copy (headline/subhead/CTA) instead of placeholder copy used in design exploration
- [ ] Validate $9.99 / $14.95 pricing with real coach feedback before launch
- [ ] Decide the coach enquiry method on `/coaches/[slug]` (currently a placeholder — mailto vs. an in-app contact form)

## Working notes

- This project folder is the shared context for Claude across sessions — update this file as decisions get made (chosen direction, finalised pricing, MVP scope, tech stack) so future sessions don't have to re-derive them from scratch.
