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

## Status / next steps

- [ ] Review 5 Claude Design directions and choose one (or graft favourite elements together)
- [ ] Lock in brand assets (logo, palette, type) from the chosen direction
- [ ] Define MVP feature set precisely (which of: rider search, coach profiles, payments, clinics/events, notifications ship in v1)
- [ ] Decide on tech stack / build approach once a direction is chosen
- [ ] Firm up real hero copy (headline/subhead/CTA) instead of placeholder copy used in design exploration
- [ ] Validate $9.99 / $14.95 pricing with real coach feedback before launch

## Working notes

- This project folder is the shared context for Claude across sessions — update this file as decisions get made (chosen direction, finalised pricing, MVP scope, tech stack) so future sessions don't have to re-derive them from scratch.
