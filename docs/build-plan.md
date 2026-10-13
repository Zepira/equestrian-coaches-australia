# Build plan: what's left before coaches, then riders

Written 12 Oct 2026. Every status below was checked against the code that day, with the file that shows it.

## How to use it

- Work top to bottom. The phases are in dependency order, so an item usually only needs the ones above it.
- Tick `- [x]` when an item is built. Then add a section to `docs/test-plan.md` for Alana to hand-test it, and a line to `content/handbook/whats-built.html` so Kim knows it exists.
- Alana's mode is build first, test and refine later, so "built" means working code plus its test-plan section, not fully tested.
- **Needs Alana** marks a step only she can do: dashboards, accounts, money, legal, anything with a password.
- Sizes: **S** under an hour, **M** about a session, **L** more than one session.
- The test site deploys from `main`, so anything merged is live behind the test password.

**Next:** finish the Sydney switch (Alana: Vercel keys and Supabase Auth settings), then Phase 1's phone number, or the next item you pick.

## Phase 1: Before the first real coach

These are the must-dos. Without them a coach can't sign up, or signs up into something that will have to be wiped or fixed under them.

- [x] **Up to three locations on Clinic**. A Clinic provider can add two extra places, each with its own travel radius; each appears in search and area pages for that place, and extras over the plan go dormant. Built 12 Oct (`0022_provider_locations.sql`, `src/app/dashboard/profile/location-actions.ts`); test plan section 12.
- [x] **Error pages** (built 12 Oct; test plan section 13). `src/app/error.tsx` and `src/app/global-error.tsx` in the site's style, with a way home and the contact address; also a dashboard-level one so a coach doesn't lose the whole shell. Size S. Status: not started (neither file exists).
- [x] **Error alerts** (Sentry wired in 12 Oct; switches on when the DSN is set; test plan section 13). Someone hears about a server error the day it happens. Sentry free tier wired into both error boundaries and server actions, or a Vercel log alert if that's enough. Size S to M. Needs Alana: create the Sentry project (or the Vercel alert) and add the DSN to Vercel. Depends on: error pages.
- [x] **Coaches-only stage** (`SITE_STAGE=coaches`, built 12 Oct; test plan section 14; `docs/launch.md` "The three stages"). A third mode between coming soon and launched: on the public host, coach paths (`/for-coaches`, `/for-professionals`, `/list-your-business`, `/join/*`, `/signup`, `/login`, `/auth/*`, `/forgot-password`, `/reset-password`, `/onboarding`, `/dashboard/*`, `/api/webhooks/*`, legal pages) serve normally while every rider path still shows coming soon. `SITE_LAUNCHED=true` stays the full launch. Extend `src/lib/launch.ts`, `isPreLaunchPath()` in `src/proxy.ts`, `robots.ts`/sitemap (still noindex for coach pages? decide), and add a `coaches` mode to `scripts/launch/host-gate.mjs`. The Stripe live-key guard in `src/lib/stripe.ts` must accept this stage too. Size M. Status: not started (`src/lib/launch.ts` only knows `SITE_LAUNCHED`). Update `docs/launch.md`.
- [x] **Wipe guard on the rebuild script** (built 13 Oct; `--check` runs it alone; test plan section 15). `scripts/db/rebuild.mjs` refuses to run when any provider has a real paid or published status (or any `subscriptions` row with a Stripe ID), whatever flags are passed. Size S. Status: not started (it only checks `--yes-wipe`).
- [x] **Move to Sydney** (13 Oct: a faithful copy rather than a wipe, `scripts/db/move-database.mjs`; local `.env` switched; Vercel and Auth settings still to do; test plan section 16). Was: **Wipe and rebuild in Sydney**. New Supabase project in `ap-southeast-2` (the privacy policy already says Sydney), export the waitlist and keepers first (`scripts/db/export-keepers.mjs`), run the baseline plus `0002` onward, reseed, re-import waitlist, repoint env vars, redo storage buckets and Auth settings. Size M to L. Depends on: wipe guard. Needs Alana: create the project, copy keys into Vercel and `.env`, Auth URLs and SMTP again (see Phase 3), pooler region note in `CLAUDE.md`.
- [ ] **Phone number shown to coaches**. `support_phone` shows on `/for-coaches`, `/for-professionals`, sign-up and onboarding (plain line near the contact address), not only inside auth error messages. Size S. Status: partly done; it appears only in the error catch-all on `/login`, `/signup`, `/forgot-password`, `/reset-password` (`src/app/login/page.tsx`, `src/app/signup/signup-form.tsx`). Needs Alana: set the number in Admin → Settings.
- [ ] **Kim's four calls built into onboarding**. Whatever Kim decides on card at founding sign-up, when the free period starts and the other two calls, reflected in `src/lib/founding.ts`, the sign-up flow and the founding copy. Size M. Depends on: the decision (see Decisions waiting).
- [ ] **Professional closes their own account**. A "Close my account" page in the dashboard: cancels the Stripe subscription first (no refund unless the refund policy says so), hides the profile through `provider-lifecycle.ts`, then deletes the account; the terms promise it. Size M. Status: not started (`/account/delete` exists but is rider-only and never touches Stripe: `src/app/account/actions.ts` `deleteAccount`).
- [ ] **Account closure purge within 30 days**. A daily job removes what's left of a closed account (photos in storage, provider rows, enquiries' contact details) 30 days after closure, as the privacy policy says. Size M. Depends on: account closure. Status: not started.

## Phase 2: Make the plans honest

The pitch (`src/lib/pitch.ts`, shown on `/for-coaches` and the plans table) sells these. Each one is either built or taken out of the table before a coach pays. See "Decisions waiting" for which way each should go.

- [ ] **Photo limits by plan**. 1 photo on Listed, 10 on Spotlight and Clinic, as a `plan_capabilities` value, enforced in the upload action and shown in the dashboard. Size S. Status: not started (no limit anywhere in `src/app/dashboard/profile/`; `PlanCapability` in `src/lib/tiers.ts` has no photo field).
- [ ] **Contact methods by plan, plus website link**. Listed: phone or email (plus the form); Spotlight and up: all methods and a website link. Add the website field to the dashboard and the profile (the `website_url` column is already in `0001_baseline.sql`, but no screen uses it), and a capability that gates it. Size M. Status: not started (`src/app/dashboard/profile/actions.ts` saves every channel for every plan).
- [ ] **Waitlist capture on events (Clinic)**. When an event is full, riders can join its waitlist and the provider sees the list. Size M. Status: not started (only the "taking students: waitlist" status exists, `src/app/dashboard/actions.ts`).
- [ ] **Full funnel and 12-month trend on Spotlight**. Decide whether Listed sees less on the dashboard; today everyone sees the same chart. Gate it with a capability or change the pitch line. Size S. Status: partly done (chart exists for all plans, `src/app/dashboard/page.tsx`).
- [ ] **Google search impressions on the dashboard**. A Spotlight panel reading `gsc_daily` for the provider's profile URL: impressions, clicks, top queries. Size M. Depends on: Phase 4 Search Console import. Status: not started (`gsc_daily` exists in `0001_baseline.sql`, nothing writes or reads it).
- [ ] **Instant enquiry alerts by SMS**. Text the provider when an enquiry arrives, opt-in with their mobile, Spotlight and up. Size L. Depends on: SMS provider decision. Needs Alana: provider account, ACMA sender ID registration, money. Status: not started (email alert exists for every plan, `src/app/profile/[slug]/actions.ts`; no SMS code anywhere).
- [ ] **Every provider on at least one live page (fallback ladder)**. A provider no area or discipline page lists (too few nearby to clear the gate) appears on the next level up: region, then state, then the profession page. Size M to L. Status: partly done (the weekly digest flags them via `unlisted_providers()`, `src/lib/seo-digest.ts`; the ladder itself is not built).
- [ ] **Optional "from $X per hour" price**. A nullable field on the profile and card; measure enquiry rate with and without it. Size M. Status: not started.

## Phase 3: Coach launch setup

Accounts, money and email. Mostly Alana in dashboards, with code where noted.

- [ ] **Supabase Auth email through Resend**. Custom SMTP in Supabase pointing at Resend, branded templates from `docs/auth-email-templates.md`, Redirect URLs `…/auth/confirm**` for both hosts. Size S. Status: code done 27 Sep (`/auth/confirm`, templates); dashboard steps not done. Needs Alana: all of it. Redo after the Sydney rebuild.
- [ ] **Admin settings before coaches**. `review_alert_emails` set, `show_sample_listings` off, `support_phone` set, founding dates (`founding_join_by`) checked. ABN already done. Size S. Needs Alana.
- [ ] **Vercel Pro and hourly crons**. Move to Pro before the first charge (Hobby is non-commercial), confirm the cron count (ten paths in `vercel.json`), make `sequences` and `campaigns` hourly, set `CRON_SECRET`. Size S. Needs Alana: the upgrade and money.
- [ ] **Supabase plan and backups**. Decide whether to go Pro for daily backups before real coaches pay; at minimum a scheduled `pg_dump` somewhere safe. Size S. Needs Alana.
- [ ] **Stripe activation**. Live account, business details, the public phone and address Stripe asks for, live Price IDs entered on Admin → Plans, webhook to the public host, `NEXT_PUBLIC_STRIPE_PRICE_FOUNDING`. Depends on: coaches-only stage, phone number shown. Needs Alana.
- [ ] **Payment testing**. In Stripe test mode: test cards (success, decline, 3DS), a test clock run through the whole founding trial (card saved, launch-day activation, 30/14/3-day reminders, first charge, referral reward), failed payment and recovery, pause, cancel, plan up and down. Write each path into `docs/test-plan.md`. Size M to L. Depends on: Kim's four calls built.

## Phase 4: Measuring

- [ ] **Bot and self-view exclusion**. `provider_events` skips known crawler user agents, the provider viewing their own profile, and admins. Size S. Status: not started (`src/lib/coach-events.ts` dedupes per visitor per day, nothing more).
- [ ] **Weekly Search Console import**. A weekly cron that pulls page and query rows into `gsc_daily`. The digest already reads Search Console live (`src/lib/search-console.ts`). Size M. Needs Alana: verify the `sc-domain:` property, create the GCP service account, add it as a user, set `GOOGLE_SERVICE_ACCOUNT_KEY` and `GSC_SITE_URL`. Note the cron count on Hobby.
- [ ] **UTM scheme for QR cards**. Decide the naming (`utm_source=print`, `utm_medium=qr`, `utm_campaign=<place or event>`), make the `/go` links for each card on Admin → Links, then print. Size S. Status: mostly done; `/go/[slug]` adds the link's utm tags (`src/app/go/[slug]/route.ts`), only the scheme and the links themselves are left.
- [ ] **Simple internal marketing dashboard**. One admin page: sign-ups by source and week, providers by plan and profession, enquiries per provider, waitlist and rider list growth, `/go` clicks. Size M.

## Phase 5: Before riders

- [ ] **Competition entries deleted 12 months after the result**. Add to the daily retention job, as the privacy policy promises. Size S. Status: not started (no delete in `0016_competitions_sponsors_awards.sql` or `src/app/api/cron/`).
- [ ] **Full launch run-through**. `SITE_LAUNCHED=true` on the test host first, host-gate script in `launched` mode, Search Console verified on the day, `show_sample_listings` off. Follow `docs/launch.md`. Needs Alana.

Already done from the original list, so not repeated above: **enquiry contact details deleted after `enquiry_retention_months`** is built and scheduled (`src/app/api/cron/retention/route.ts`, `redact_old_enquiries` from `0017_enquiry_retention.sql`, daily in `vercel.json`).

## Decisions waiting

- **Kim's four calls** (card at founding sign-up, when the free period starts, and the other two). Recommendation: decide these first; they change onboarding, billing copy and the test clock run. Keep card at sign-up, which the marketing plan's conversion numbers rest on.
- **Build or drop each unbuilt plan feature.** Recommendation: build photo limits, contact methods and website link (cheap, and they are the clearest reasons to upgrade); build the Search Console panel once the import exists; drop SMS and event waitlist capture from the table for now and add them back when built. A pitch line that isn't true is a consumer-law problem, not just a bug.
- **SMS provider**, if SMS stays. Recommendation: wait. If needed, a provider with an Australian sender ID and simple per-message pricing (Twilio, MessageMedia or ClickSend), opt-in only, Spotlight and up. The ACMA sender ID register needs lead time, so start that early if the answer is yes.
- **Sentry or Vercel log alert.** Recommendation: Sentry free tier; it catches client errors too and groups them, which a log alert doesn't.
- **Are coach pages indexed during the coaches-only stage?** Recommendation: no. Keep everything but `/` noindex until riders can use the site, so nothing is indexed half-built.
- **Funnel and trend on Listed.** Recommendation: leave the chart on for everyone and reword the Spotlight line to what Spotlight adds (Search Console data), rather than taking something away from Listed.
- **Supabase Pro at coach launch.** Recommendation: yes once the first coach pays; daily backups are worth US$25 a month when real people's data is in it.
- **"From $X per hour".** Recommendation: build it optional and measure; don't show it on cards until there are enough coaches to compare.

## Done today (12 Oct 2026)

- The database copied to Sydney (`scripts/db/move-database.mjs`), every count matching; scripts read `SUPABASE_POOLER_HOST`.
- Wipe lock on `rebuild.mjs` (`--check`).
- Coaches-only stage (`SITE_STAGE` and `isCoachStagePath` in `src/lib/launch.ts`, the proxy, trimmed header and footer, live Stripe keys allowed from this stage, mock payments refused on the public host, host-gate `--mode coaches`).
- Error pages (`error.tsx` at the root, dashboard and admin, `global-error.tsx`) and Sentry (`src/instrumentation*.ts`, `src/lib/sentry-options.ts`, tunnel at `/monitoring`). Needs Alana: the Sentry account and Vercel env vars.
- Up to three locations on Clinic (`0022_provider_locations.sql`, `nearby_providers` v3, Dashboard → Profile → Other locations).
- Legal pages on the pre-launch allowlist.
- Testimonial request link and reminders (`src/lib/testimonials.ts`, `src/app/testimonial/`, `src/app/dashboard/testimonials/`, `0021_testimonials.sql`).
- Pin a testimonial.
- Direct-to-storage uploads, so large photos work on Vercel; bucket limits in `0020_bucket_limits.sql`.
- Intro videos as YouTube or Vimeo links (`src/lib/video-embed.ts`).
- Pitch pages, busy states, and the test plan (`docs/test-plan.md`) and what's-built summary (`content/handbook/whats-built.html`).
