# The Marketing Engine: build checklist

Working checklist for `content/handbook/marketing-engine.html` ("The Marketing Engine", 25 Sep 2026). The handbook doc is the plan and stays as written; this file records what's built.

## Stage A: Foundations (before launch)

- [x] **M1 Audience and consent** (`0010_marketing_foundations.sql`, `src/lib/audience.ts`)
  - `contacts`: one row per email address (riders, professionals, people who asked for an alert without an account), linked to a profile when there is one, with a token for the preferences page. Every sign-up makes or joins one (the sign-up trigger).
  - `consents`: append-only (a trigger refuses updates and deletes), per contact and purpose (`rider_alerts`, `rider_news`, `provider_news`, `waitlist`, `invite`), with type (express, existing customer, published address), the wording id, source, method, IP and who. Status is the newest row (`consent_status` view, security invoker).
  - `consent_wordings`: the exact words of every box, versioned; forms read the newest; Admin → Audience saves new words as a new version.
  - `suppressions`: bounce (stops everything), unsubscribe from everything, complaint, admin block. `sendEmail` drops bounced addresses from every send; `canSend()` checks consent and suppressions before every commercial one.
  - Every commercial email (rider alerts, the rider round-up, the monthly numbers email) goes only with consent and carries the footer (who we are, the ABN once set in Settings, how to reach us, the preferences link) and a one-click `List-Unsubscribe` header (`/api/unsubscribe?t=…&p=…`).
  - `/email-preferences?t=…`: each topic on or off with its words, and "stop everything"; nothing changes on page load.
  - `/api/webhooks/resend`: Svix-signed bounce and complaint events write suppressions (needs `RESEND_WEBHOOK_SECRET`; refuses without it).
  - Every email in the registry is factual or commercial; a factual email that promotes anything is refused on save.
  - Sign-up for professionals has an unticked box for the monthly numbers and news; the dashboard offers it to anyone who hasn't said yes (so existing profiles don't silently stop getting it). Alerts record rider_alerts consent, and the round-up is its own unticked box.
  - Invites need the page where the business address is published; an address on the do-not-email list can't be invited; the invite records a published-address consent.
  - Removing a rider on request deletes their contact and keeps the address on the do-not-email list.
- [x] **M2 Tracked links and sources**
  - `links` and `link_clicks`; `/go/[slug]` counts a click once per visitor a day, sets first-touch and last-touch cookies (`src/lib/touch.ts`), and redirects with the utm tags. Any address with `utm_source` or `ref` sets them too (`src/proxy.ts`).
  - Sign-up carries both touches to the contact, and the provider's acquisition source falls back to the first touch.
  - Admin → Links and sources: make a link in a line, download its QR code (SVG), clicks in 30 days and in all, and sign-ups, finished profiles and paying professionals by first source and month.
- [x] **M3 On-site capture**
  - Subscribe card (`src/components/subscribe-card.tsx`) on profession, speciality and area pages (both doors), discipline pages, events, landing pages and under search results. Signed in: the alert is made at once. Not signed in: `pending_alerts` and a confirm email (`email.alert_confirm`, factual); pressing the button on `/alerts/confirm` makes the rider account and the alert with its consents. Honeypot field and three requests per address a day.
  - Empty results: the card, plus "Know a good farrier? Send them this link" (the visitor sends it themselves).
  - Announcement bar (`site.announcement`): message, link, start and end dates, audience, dismiss that remembers. It runs along the bottom of the screen, because the header floats over the photos at the top.
  - Slide-in (`site.slide_in`): off by default; delay and frequency are settings; never to someone signed in or already subscribed, never on a profile or private page.
  - Landing pages at `/p/[slug]` (Admin → On the site), noindex, with the card if wanted.
  - The waitlist handover: there is no waitlist table or coming-soon page, so there is nothing to hand over yet.
- [x] **Fixes**
  - "Physiotherapists" and "Chiropractors" renamed "Equine physiotherapy" and "Equine chiropractic" (practitioner in the singular); slugs unchanged. `profession_details.protected_titles` lists the words (vets: "specialist"). A profile or onboarding save that uses one is refused until an admin ticks "checked on the public register" on Admin → Providers; changing the number clears the check; members can't set it themselves. The profile then shows the registration and the check date. **The exact names are Kim's call; they're editable in Admin → Professions.**
  - Testimonials say "Provided by the business"; qualifications say they're shown as supplied.
  - `/how-we-list` (`how_we_list` block) linked from every results list and the featured block.
  - Yearly renewal reminder 30 days before (`email.renewal_reminder`, from the daily billing job); the Stripe webhook records `billing_interval` and `current_period_end`.
  - Privacy policy draft: the where-you-came-from cookies, the consent record and its footer, and "Decisions made automatically".
- [x] Check: 52/52 end to end on a production build (append-only consents, anonymous reads, the /go/ link with its cookies and single count, QR code, sign-up carrying source and news consent, the sources report, preferences on and off, one-click POST and a GET changing nothing, stop everything, protected titles refused then allowed after the check, the member trigger, the renamed section, the testimonial label, the card's confirm flow without an account, both consents with words and source, the empty-results card and link, `/how-we-list`, a bad announcement date refused, the bar shown and dismissed, settings saved from On the site returning there, the slide-in after its delay and never on a profile, a landing page, a factual email refusing promotion, invites refused for a stopped address and recording where the address was published, the audience record with exact words, stop all marketing, a new wording version, the yearly renewal reminder once, the webhook refusing without its secret). A consented professional's monthly email carries the footer; an unconsented one gets none. Site sweep all ok on the production build; nav 31/31 on dev.
- [ ] **Yours:** Vercel Pro (Hobby is non-commercial); Stripe Smart Retries and the failed-payment and card-expiry emails (a Stripe dashboard setting); `RESEND_WEBHOOK_SECRET` and the webhook in Resend once there's an account; the ABN in Admin → Settings once registered.
- [ ] Not done: the search behaviour suite needs more than one real coach (coaching has one). The home and search suites pass with throwaway coaches.

## Later stages

B (launch month): M4 share kit and follow link, M6 referrals and promo codes, the launch email. C: M5 reviews. D: M7 sequences, M8 campaigns, M9 guides. E: founding conversion, annual offer, pause and win-back. F: M10 competitions, M11 sponsors.
