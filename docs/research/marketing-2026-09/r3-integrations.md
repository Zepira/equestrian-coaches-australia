# R3: Third-party marketing integrations for EPA (build vs buy)

Research date: 25 Sep 2026. Scale assumed: 500–5,000 contacts in year one, up to ~10k emails/month.
Prices are **USD unless stated**. Rough conversion: US$1 ≈ A$1.50 (approximate, unverified; check on the day). Most SaaS prices exclude GST.
"Verified" = read on the vendor's own pricing or docs page today. "Secondary" = third-party review site only. "Unverified" = inference or memory, not confirmed.

---

## 0. Findings that change the picture

1. **Vercel Hobby does not allow commercial use.** Vercel's docs say "the Hobby plan restricts users to non-commercial, personal use only" ([vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby)). EPA charges subscriptions, so it needs **Vercel Pro at US$20 per developer seat per month** before launch (viewer seats are free). Pro also turns on Web Analytics custom events. Hobby does not allow custom events and keeps only 1 month of data ([vercel.com/docs/analytics/limits-and-pricing](https://vercel.com/docs/analytics/limits-and-pricing)).
2. **Resend now covers marketing email, and EPA already uses it.** Its Broadcasts, Contacts with custom properties, Segments, Topics (a per-topic unsubscribe preference page) and Automations (launched 13 April 2026) sit in the same account as the transactional email. Marketing is billed by **stored contacts** on a separate ladder from transactional: **free up to 1,000 contacts, then Pro Marketing US$40/mo for 5,000 contacts**, rising to US$650/mo at 150k ([resend.com/docs/knowledge-base/what-is-resend-pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing); [resend.com/blog/introducing-automations](https://resend.com/blog/introducing-automations)). That is the cheapest credible option that needs no new vendor.
3. **Australia's SMS Sender ID Register became mandatory on 1 July 2026.** Texts sent under a branded (alphanumeric) sender ID that isn't registered now show as **"Unverified"**. Registration goes through your SMS provider, and the sender ID must match the ABN entity name or a recognisable short form of it ([acma.gov.au/sms-sender-id-register](https://www.acma.gov.au/sms-sender-id-register); [twilio.com blog](https://www.twilio.com/en-us/blog/insights/australia-sender-id-register)).
4. **None of the email platforms checked store data in Australia.** Resend keeps account data in the US; its sending regions are us-east-1, eu-west-1, sa-east-1 and ap-northeast-1 (Tokyo), with no Sydney region ([resend.com/docs/.../regions](https://resend.com/docs/dashboard/domains/regions)). Brevo and MailerLite are EU-based, and Loops, Kit, Mailchimp and Customer.io are US-based (Customer.io also offers EU). **Recommendation:** keep the master rider list in Supabase (Sydney region, ap-southeast-2) as the source of truth, and push only what each tool needs (email, first name, area, profession, topics). The privacy policy must disclose the overseas processors under APP 8. The only vendor found claiming AU/NZ data residency is Kudosity (Burst SMS).

---

## 1. Email marketing, broadcasts and automations

| Tool | Price at ~1k / ~5k contacts | Supabase sync | Segment on area/profession | Verdict |
|---|---|---|---|---|
| **Resend (Marketing)** | Free ≤1,000 contacts; **$40/mo at 5,000**. Automations: 10k runs/mo free, then $0.0015/run (paid plans). Transactional is billed separately: Free 3k emails/mo (daily cap applies), Pro $20/mo for 50k. **Verified** ([pricing](https://resend.com/pricing), [KB](https://resend.com/docs/knowledge-base/what-is-resend-pricing)) | Already in the stack. Contacts API; a Supabase DB webhook or trigger → Edge Function or Next route upserts the contact. SDK and React Email templates are already used | Contact **properties** (string/number, [docs](https://resend.com/docs/dashboard/audiences/properties)) plus Segments and Topics. Segment *membership* seems to be set by API or dashboard; dynamic property filters are **unverified**, so the practical route is to compute segments in Postgres and sync them | **USE** |
| **Loops** | Free: 1,000 newest contacts can be emailed, 4,000 sends per rolling 30 days, "Powered by Loops" footer. Paid: **$49/mo for 1k–5k subscribers, $99/mo for 5k–10k**. Free tier verified ([loops.so/pricing](https://loops.so/pricing)); paid brackets secondary ([sequenzy.com/pricing/loops](https://www.sequenzy.com/pricing/loops)) | **First-party Supabase integration**: contact sync plus an Auth email hook ([loops.so/docs/integrations/supabase](https://loops.so/docs/integrations/supabase)) | Custom contact properties, mailing lists, event-triggered loops | MAYBE: the best fallback if Resend's marketing tooling feels thin |
| **Sequenzy** | Priced per email, unlimited contacts: Free 2.5k emails/mo; **$19/mo for 15k**; $29 for 30k. **Verified** ([sequenzy.com/pricing](https://www.sequenzy.com/pricing)) | REST API, native Stripe integration | Unlimited segments | MAYBE: cheap, but a young vendor that publishes competitor-attack content |
| **Plunk** | Free 1k emails/mo (branded); then $0.001/email (10k ≈ $10). Self-host is AGPL, runs on Docker. **Verified** ([useplunk.com/pricing](https://www.useplunk.com/pricing)) | API | Contact data, segments | SKIP (small vendor; self-hosting needs time the founders don't have) |
| **useSend** (OSS) | Cloud: free 3k/mo; paid $10 minimum, marketing $0.001/email. Self-host on AWS SES. **Verified** ([usesend.com](https://usesend.com/)) | API, SDKs | Basic lists | SKIP (same reason) |
| **Listmonk** (self-host) | Free software (AGPLv3), v6.2.0 released June 2026, needs Postgres. Pay for SES or SMTP plus a host. **Verified** ([listmonk.app](https://listmonk.app/)) | Could point at its own Postgres DB | Good: SQL-query segments | SKIP (ops burden: a server, upgrades, bounce handling) |
| **Bento** | **$29/mo up to 5,000 active users** (unlimited sends); 30-day trial. **Verified** ([bentonow.com/pricing](https://bentonow.com/pricing)) | API and events | Tags and fields | MAYBE (good value, but a second vendor alongside Resend) |
| **MailerLite** | Free ≤250 subs / 2,500 emails (cut in 2026). **Comfort $19 at 1k, $49 at 5k**; Power $39 / $69. Secondary ([emailtooltester](https://www.emailtooltester.com/en/reviews/mailerlite/pricing/)); page shows "from $12" ([mailerlite.com/pricing](https://www.mailerlite.com/pricing)) | API plus webhooks; sync is custom code | Custom fields and groups | MAYBE (friendliest editor for Kim) |
| **Brevo** | Free: 300 emails/day, contacts ~unlimited. **Starter from $9/mo for 5k emails**; Standard from $18. Branding removal +$10/mo on Starter. Secondary ([emailtooltester](https://www.emailtooltester.com/en/reviews/brevo/pricing/)); vendor page hides prices ([brevo.com/pricing](https://www.brevo.com/pricing/)) | API, custom code | Contact attributes and segments | MAYBE (cheap at low send volume; bundles SMS; EU-hosted) |
| **Kit** | Free up to 10,000 subs (broadcasts, tags). Secondary sources say the **free plan lost automations in Sept 2026** (single source, [emailtooltester](https://www.emailtooltester.com/en/reviews/convertkit/pricing/)). Creator: $33/mo on the vendor page at 1k (annual equivalent; [kit.com/pricing](https://kit.com/pricing)), about $39 monthly at 1k, $59 at 3k, $89 at 5k (secondary) | API v4, custom sync | Tags and custom fields | SKIP (built for creators and costs more once automations are needed) |
| **Mailchimp** | Free ≤250 contacts. Essentials from $13/mo, Standard from $20/mo (500 contacts, promo "for 12 months"), rising steeply with contacts. **Verified** (starting prices) ([mailchimp.com/pricing](https://mailchimp.com/pricing/marketing/)) | API, custom | Merge fields and tags | SKIP (expensive per contact; charges for unsubscribed contacts) |
| **Klaviyo** | Free ≤250 profiles / 500 sends. Email plan ~$30 at 1k, **$100 at 5k**. Secondary ([emailtooltester](https://www.emailtooltester.com/en/reviews/klaviyo/pricing/)) | API | Excellent | SKIP (built for ecommerce; bills on all active profiles) |
| **Customer.io** | Essentials **$100/mo** for 5k profiles and 1M emails. **Startup Program: 1 year free** for companies that have raised under $10M. **Verified** ([customer.io/pricing](https://customer.io/pricing)) | Strong: reverse-ETL / Data Pipelines, can read Postgres | Best-in-class | SKIP for now. A free year is tempting, but it would be ~A$150/mo from year 2 |
| **Encharge** | Growth **$99/mo monthly ($79 annual) for 2,000 subs**. **Verified** ([encharge.io/pricing](https://encharge.io/pricing/)) | API | Good | SKIP (costs too much for the scale) |

**Build vs buy (email):** EPA already has the hard parts built: rider_alerts, the monthly rider and provider emails, email templates in /admin, and Resend. The cheapest robust design:
- Postgres stays the source of truth for subscribers, consent timestamp and source, topics, area and profession.
- A Supabase trigger or cron job syncs contacts and properties to Resend Contacts and assigns Topics (for example "Events near me", "New providers", "Monthly roundup", "Provider news").
- Send one-off newsletters as **Resend Broadcasts** from the dashboard (Kim can use its editor). Keep the per-rider personalised digests as code-driven sends.
- Use Resend Automations for simple drips such as the welcome sequence and the claim-your-profile nudge.
- **Spam Act:** consent record, sender identification, and a functional unsubscribe honoured within 5 business days. Resend's topic preference page handles the unsubscribe part.

---

## 2. Referral and affiliate

| Tool | Price | Notes | Verdict |
|---|---|---|---|
| **Stripe coupons + promotion codes** | No extra fee | Per-customer promo codes (`customer` restriction), `first_time_transaction`, `max_redemptions`, `expires_at`, duration once/repeating/forever, `allow_promotion_codes` in Checkout, all via API ([docs.stripe.com/.../coupons](https://docs.stripe.com/billing/subscriptions/coupons)). For provider-refers-provider: create one promo code per provider (e.g. `KIM-JONES`), record `acquisition_source` from the code, and reward the referrer with a customer balance credit or a repeating coupon via webhook | **USE (build)** |
| Rewardful | Starter **$49/mo** (≤$7.5k affiliate revenue/mo), 0% transaction fee. **Verified** ([rewardful.com/pricing](https://www.rewardful.com/pricing)) | Pays affiliates cash; Stripe-native | SKIP |
| FirstPromoter | Starter **$49/mo** (≤$5k affiliate revenue). **Verified** ([firstpromoter.com/pricing](https://firstpromoter.com/pricing)) | Same category | SKIP |
| Tolt | Basic **$69/mo**. **Verified** ([tolt.com/pricing](https://tolt.com/pricing)) | Stripe/Paddle only | SKIP |
| Dub Partners | Business **$90/mo**, plus a 5% payout fee. **Verified** ([dub.co/pricing](https://dub.co/pricing)) | Excellent product, sized for SaaS affiliates | SKIP |
| GrowSurf | Startup **$125/mo** (annual) for ≤2,500 participants. **Verified** ([growsurf.com/pricing](https://growsurf.com/pricing)) | Customer referral widgets | SKIP |
| Viral Loops | **$35/mo** annual, $49 monthly (1,000 participants). **Verified** ([viral-loops.com/pricing](https://viral-loops.com/pricing)) | Waitlist and milestone campaigns | SKIP (the waitlist is already built) |
| ReferralHero | Free for ≤25 members; PRO **$199/mo**. **Verified** ([referralhero.com/pricing](https://referralhero.com/pricing)) | | SKIP |

Why build: the whole provider base is ~3–6k and the referral reward is a month of a $9.99–$49.95 plan. Every SaaS here costs $49–$125/mo, which is more than most months' referral value. A `referrals` table plus a Stripe webhook plus per-provider promo codes is a few hours of work and reuses the existing ref/utm → acquisition_source plumbing. **Riders** referring riders has no money involved: track `ref` on sign-up and show "You've brought N riders" if wanted.

---

## 3. Reviews

- **Google Business Profile API** can list and reply to reviews (`accounts.locations.reviews.list`, v4) ([developers.google.com/my-business/content/review-data](https://developers.google.com/my-business/content/review-data)). Access needs an application and approval, a GBP that has been verified and active for 60+ days, and a website; unapproved projects have a quota of 0 ([prereqs](https://developers.google.com/my-business/content/prereqs)). It only returns reviews for locations *you manage*, so it's useful for **EPA's own** GBP, not providers' profiles, unless each provider OAuth-connects their GBP. The **Places API (Place Details)** can read public reviews of any business, but only a handful per place (5, **unverified** limit), on the Enterprise + Atmosphere SKU (paid past the free cap, **unverified** amount), with Google attribution and display rules. **Verdict: SKIP importing Google reviews into profiles.** Instead, put a "Review us on Google" link in provider tools, and let providers link their own GBP.
- **Trustpilot**: Free profile (50 invites/mo). Paid from **$99/mo, billed annually upfront**; API only on Enterprise. Secondary ([wiserreview.com](https://wiserreview.com/blog/trustpilot-pricing/)). **SKIP** (it reviews EPA the company, not providers; expensive).
- **REVIEWS.io**: Free (25 invites/mo), Essentials $29/mo. Secondary ([rightresponseai.com](https://www.rightresponseai.com/blog/reviews-io-pricing); vendor pricing URL 404'd). **SKIP**.
- **"Product Review Club"** is a ChickAdvisor free-product-sampling community for consumer goods ([cuspera.com](https://www.cuspera.com/products/product-review-club-x-6700)), so it doesn't fit. If **ProductReview.com.au** was meant, that is an AU consumer review site for businesses and is also a poor fit for a directory. **SKIP**.
- **First-party testimonials and reviews (build): USE.** /admin already has a review queue. Rider reviews of providers are the directory's own moat and SEO content, and they belong to EPA. Guardrails that follow from the hard rules:
  - Only riders who sent an enquiry through EPA get an invite. Label these as "enquired via EPA", not "verified".
  - Moderate for defamation.
  - Don't let payment influence ranking or visibility of reviews. The ACCC rules on fake or incentivised reviews apply.

---

## 4. SMS in Australia

| Provider | AU price per SMS | Notes | Source |
|---|---|---|---|
| Twilio | **US$0.0515** per segment (≈A$0.078); AU mobile number $8.25/mo; alpha sender ID free | Best API | **Verified** [twilio.com/.../au](https://www.twilio.com/en-us/sms/pricing/au) |
| Kudosity (ex-Burst SMS) | **A$0.079 PAYG**, 5.9¢ Growth, 4.9¢ Scale | AU/NZ data residency | **Verified** [kudosity.com/pricing](https://kudosity.com/pricing) (burstsms.com.au redirects here) |
| ClickSend | ~A$0.072 at entry, down to 5.7¢; PAYG, $20 minimum top-up | Good API, AU company | Tiers verified ([clicksend.com/au/pricing](https://www.clicksend.com/au/pricing/au/)); per-message rate secondary ([mobilemessage.com.au](https://mobilemessage.com.au/best-bulk-sms-provider-australia)) |
| Cellcast | ~A$0.031 at 15k/mo volume | Budget | Secondary ([smscomparison.com.au](https://www.smscomparison.com.au/sms-gateway/)) |
| MessageMedia (Sinch) | ~5.9¢ on top plan; **monthly plans A$45–789** | Enterprise-ish | Secondary (messagemedia.com/au/pricing now redirects to sinch.com) |
| Mobile Message | 2–4¢ standard | ACMA-certified, helps with sender ID registration | Secondary (the comparison page belongs to this vendor) |

**Sender ID rule:** mandatory since **1 July 2026**. Unregistered alphanumeric IDs are relabelled "Unverified". You register through the provider using your ABN, and the ID must be 2–11 characters matching the entity name or a recognised short form ([ACMA](https://www.acma.gov.au/sms-sender-id-register)). No registration fees were published by the providers checked.

**Verdict: SKIP in year one.** At ~8¢ a message, a monthly SMS to 2,000 riders costs about A$160, and SMS needs separate express consent under the Spam Act. If added later (e.g. "clinic tomorrow has 2 spots left"), use ClickSend or Twilio PAYG, opt-in only, and register "EquinePros" (or similar) as the sender ID first.

---

## 5. Web push

- **OneSignal**: Free web push (max 10,000 subscribers per send). Growth $19/mo + $0.004 per web subscriber. **Verified** ([onesignal.com/pricing](https://onesignal.com/pricing)). Lock-in: subscriptions sit in OneSignal.
- **Self-hosted** with the `web-push` npm package plus VAPID keys, storing subscriptions in Supabase: free, and the data stays owned ([web.dev overview](https://web.dev/articles/push-notifications-overview)).
- **iOS constraint:** Safari on iOS/iPadOS (16.4+) only delivers web push to a site the user has **added to the Home Screen** as a PWA with a manifest. Plain Safari tabs can't subscribe (known platform behaviour; **unverified** today). Riders are heavily iPhone users, so reach would be low.
- **Verdict: SKIP.** Email rider_alerts already cover "new event near you". Reconsider only if there is a PWA or native-app push.

---

## 6. Analytics, attribution and experimentation

| Tool | Price | Fit | Verdict |
|---|---|---|---|
| **Own event table** (planned) | $0 | Profile views, contact reveals, enquiries: the numbers providers see | **USE** (already planned) |
| **Vercel Web Analytics** | Hobby: 50k events/mo, page views only, 1-month window. **Pro: $0.03 per 1k events**, custom events (2 props), 12-month window; Web Analytics Plus +$10/mo adds UTM parameters and 24 months. **Verified** ([docs](https://vercel.com/docs/analytics/limits-and-pricing)) | Zero setup, cookieless | **USE** (on Pro, which is needed anyway) |
| **PostHog** | Free monthly: 1M analytics events, 1M feature-flag requests, 5k replays, **1,500 survey responses**; experiments included. US or EU cloud. **Verified** ([posthog.com/pricing](https://posthog.com/pricing)) | Funnels, A/B tests on the claim flow, on-site surveys ("what brought you here?") | **USE** (free tier; set billing limits to $0) |
| GA4 | Free | Needed for Google Ads/Meta audiences only; heavy, needs a cookie banner | MAYBE (skip unless running ads) |
| Plausible | From **$9/mo (10k pageviews)**. **Verified** ([plausible.io](https://plausible.io/#pricing)); higher tiers not captured (100k ≈ $19, **unverified**). EU-hosted | Simple and privacy-friendly | SKIP (Vercel covers this) |
| Fathom | **$15/mo for 100k pageviews**, 50 sites. **Verified** ([usefathom.com/pricing](https://usefathom.com/pricing)) | Same | SKIP |
| Google Search Console | Free | Already ingested | USE |
| **Dub links** (shortener + UTM) | Free: 25 links/mo, 1k tracked events; **Pro $25/mo**. Secondary ([linklyhq.com](https://linklyhq.com/review/dub)) | Nice QR codes and click analytics | SKIP. Build `/go/[slug]` redirects in Next.js that log to the event table and append UTMs; Kim's invite links already do this |

---

## 7. Social scheduling and share images

- **Meta Business Suite**: free scheduling for Facebook and Instagram, which is where AU equestrian audiences are. **USE**.
- **Buffer**: Free for 3 channels with 10 scheduled posts per channel; Essentials **$5 per channel per month**. **Verified** ([buffer.com/pricing](https://buffer.com/pricing)). MAYBE (only if they add LinkedIn, TikTok etc.).
- **Metricool**: Free for 1 brand, 20 posts/mo; Starter €16/mo. **Verified** ([metricool.com/pricing](https://metricool.com/pricing/)). MAYBE.
- **Later**: no free plan; from **$18.75/mo** (annual). **Verified** ([later.com/pricing](https://later.com/pricing/)). SKIP.
- **Canva**: Pro **A$165/yr** for one person, Business A$280/yr per person. **Verified** ([canva.com/en_au/pricing](https://www.canva.com/en_au/pricing/)). The Connect **Autofill API** with brand templates is now documented as available on Pro, Teams and Enterprise, and requires MFA ([canva.dev](https://www.canva.dev/docs/connect/autofill-guide/)). Canva Pro for Kim's hand-made posts: **USE** (optional). Autofill automation: **SKIP**.
- **@vercel/og / Next.js `ImageResponse`**: free, built in. It generates OG and share cards per provider profile, event and area page (e.g. "Dressage coaches in Bendigo – 12 listed"), so every shared link looks good automatically. **USE (build)**. A "download share card" button for providers ("Find me on EPA") turns them into distributors and costs no founder hours.

---

## 8. Popups and forms

| Tool | Price | Verdict |
|---|---|---|
| **Build in React** | $0 | **USE**. A waitlist table and admin already exist. One reusable `<SubscribeCard topic="events" area=…>` inline component on area, event and profile pages, plus an exit or scroll-triggered slide-in, writing to Supabase with a consent record. Full control of Spam Act consent wording, and no third-party script weight |
| **Tally** | Free: unlimited forms and submissions, webhooks included; Pro $24/mo. **Verified** ([tally.so/pricing](https://tally.so/pricing)) | **USE** for one-off surveys (provider onboarding interviews, event submissions) → webhook into Supabase |
| Typeform | Free 100 responses/mo; Basic $29/mo. **Verified** ([typeform.com/pricing](https://www.typeform.com/pricing/)) | SKIP |
| OptinMonster | $7–49/mo annual (intro pricing; renews at full price). **Verified** ([optinmonster.com/pricing](https://optinmonster.com/pricing/)) | SKIP |
| Hello Bar | Free 5k views; Growth $39/mo. **Verified** ([hellobar.com/pricing](https://www.hellobar.com/pricing/)) | SKIP |
| ConvertBox | $495 lifetime deal ("limited time"), 250k views. **Verified** ([convertbox.com](https://convertbox.com/)) | SKIP |
| Sumo | Rebranded **BDOW!**; sumo.com no longer shows the product; prices not published on the page found ([bdow.com](https://bdow.com/stories/new-sumo-pricing/)) | SKIP |

---

## 9. Headless CMS for blog and guides

| Option | Price | Fit | Verdict |
|---|---|---|---|
| **Extend `content_blocks`** (add `guides` table + Markdown/MDX field + admin editor) | $0 | Same auth, admin and DB; ISR pages. Enough for ~1–4 guides a month | **USE** first |
| **MDX in repo** | $0 | Needs a developer or Git to publish; fine if the founders write in Git | MAYBE |
| **Keystatic** | Free (local/GitHub mode); Keystatic Cloud optional (price not on page) ([keystatic.com](https://keystatic.com/)) | Git-backed editor UI for Kim, Next.js supported | MAYBE (best "buy" if Kim wants a nice editor) |
| Outstatic | Free, OSS, GitHub-backed ([outstatic.com](https://outstatic.com/)) | Similar, smaller project | MAYBE |
| **Payload 3** | Free, MIT; runs inside the Next.js app; Postgres adapter works with Supabase. Figma bought Payload in June 2025; Payload Cloud paused new sign-ups (secondary, [techsy.io](https://techsy.io/en/blog/payload-cms-guide); [Supabase guide](https://payloadcms.com/posts/guides/setting-up-payload-with-supabase-for-your-nextjs-app-a-step-by-step-guide)) | Powerful, but a second admin and auth system alongside /admin | SKIP (overlaps the custom admin) |
| Sanity | Free: 20 seats, 10k docs, 250k API req/mo; Growth $15/seat. **Verified** ([sanity.io/pricing](https://www.sanity.io/pricing)) | Great editor, hosted | MAYBE (only if editorial becomes a big pillar) |
| TinaCMS | Free for 2 users; Team $24/mo. **Verified** ([tina.io/pricing](https://tina.io/pricing)) | Git-backed visual editing | SKIP |
| Contentful | Free (10k records, 100k API calls); Lite **$300/mo**. **Verified** ([contentful.com/pricing](https://www.contentful.com/pricing/)) | Enterprise pricing cliff | SKIP |

---

## 10. Selling ad and sponsor inventory to equestrian brands

- Broadstreet **$299/mo** (secondary, [G2](https://www.g2.com/products/broadstreet/pricing)). Kevel: enterprise and quote-only ([Capterra](https://www.capterra.com/p/170897/Kevel/)). Google Ad Manager: free, but built for programmatic and needs AdSense/AdX, which brings low-quality ads that would hurt trust. EthicalAds targets developer audiences. **All SKIP: overkill.**
- **Build:** a `sponsors` table (brand, creative, link, placement, area or profession targeting, start/end dates), a `<SponsorSlot>` component, click and impression logging to the event table via `/go/`, and a monthly PDF or email report. Sell manually (Kim) as fixed monthly packages, e.g. "Newsletter sponsor + site banner, A$X/month". Label ads "Sponsored". Keep them separate from the featured-provider slots and never mix them with organic ranking.

---

## Recommended minimum sensible stack

| Need | Choice | Monthly cost |
|---|---|---|
| Hosting (commercial use required) | Vercel Pro, 1 developer seat (others free viewers) | **US$20** (+ small usage) |
| Transactional email | Resend Free (3k/mo, daily cap) → Pro when alerts outgrow it | US$0 → **US$20** |
| Marketing email + automations | Resend Marketing: free ≤1,000 contacts → Pro Marketing | US$0 → **US$40** at 5k contacts |
| List ownership | Supabase (Sydney) as source of truth, synced to Resend Contacts/Topics | $0 (existing) |
| Referral | Stripe promo codes + own `referrals` table | $0 |
| Reviews | First-party review queue (built) + "review us on Google" link | $0 |
| Analytics | Own event table + Vercel Web Analytics (Pro usage, ~$0.03/1k events) + PostHog free (funnels, flags, surveys) + Search Console | ~US$0–3 |
| Links/UTMs | Own `/go/[slug]` redirect route | $0 |
| Share images | @vercel/og per profile, event and area | $0 |
| Social | Meta Business Suite (free); Buffer free if >2 platforms | $0 |
| Design | Canva Free, or Pro A$165/yr (≈A$14/mo) | A$0–14 |
| Forms/popups | Own React components; Tally free for surveys | $0 |
| Blog/guides | Extend content_blocks (or Keystatic if Kim wants a Git editor) | $0 |
| Sponsors/ads | Own `sponsors` table + slot component | $0 |
| SMS, web push | Not in year one | $0 |

**Total monthly cost**
- **At launch** (<1,000 contacts, <3k transactional emails/mo): **~US$20/mo ≈ A$30/mo**. That is essentially just Vercel Pro, which is a compliance requirement, not a marketing cost.
- **At end of year one** (~5,000 contacts, ~10k emails/mo): Vercel Pro $20 + Resend Pro $20 + Resend Marketing $40, plus about $3 of usage, ≈ **US$83/mo ≈ A$125/mo**, plus optional Canva Pro (~A$14/mo). Marginal marketing tooling beyond hosting is ≈ **A$90/mo** at 5k contacts.
- **Cheapest alternative if Resend Marketing disappoints:** Loops $49/mo (≤5k) or Sequenzy $19/mo (15k emails), both of which bundle transactional. Swapping is low-risk because the list lives in Supabase.

**What not to buy:** Klaviyo, Customer.io (after its free year), Encharge, Trustpilot, any affiliate SaaS, any ad server, SMS subscriptions, or OneSignal. Each costs more per month than the value it would unlock at 3–6k providers and a few thousand riders, or it puts the rider list in someone else's system.

**Unverified or secondary figures to re-check before committing:**
- Loops paid brackets, Kit tier prices and the removal of automations from its free plan, Brevo/MailerLite/Klaviyo tier prices (vendor pages hide them)
- Places API review count and price
- Per-SMS rates for ClickSend, Cellcast and MessageMedia
- Plausible 100k tier
- iOS web push details
- Whether Resend Segments filter dynamically on properties
- The AUD/USD rate
