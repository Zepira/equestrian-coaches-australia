# R2: What a WordPress site gets from marketing and directory plugins (as of Sept 2026)

Purpose: help EPA scope which marketing capabilities to build into the custom Next.js admin, by listing what a WordPress directory site would get from plugins.

Method: vendor pricing and feature pages fetched 25 Sept 2026, plus wordpress.org listings. Prices are **USD unless marked** (EUR or AUD). Most WordPress vendors show a "first-year / introductory" price with renewals at the higher "regular" price; both are given where the page showed them. **[UNVERIFIED]** marks anything taken from third-party sites or not confirmed on a vendor page.

---

## Part 1: Per-plugin summaries

### A. Email / CRM

| Plugin | Marketing features | Price |
|---|---|---|
| **Mailchimp for WordPress (MC4WP)** | Sign-up forms (AJAX, no reload), auto-append forms to post categories, form style builder, WooCommerce purchase sync to Mailchimp (segment by buying behaviour, abandoned cart, sync coupons as Mailchimp promo codes), two-way WP user ↔ Mailchimp sync, team notification emails per sign-up, local log of sign-up attempts (CSV/JSON export), subscribe/unsubscribe activity widget. The actual sending, segmentation and automation happen in Mailchimp. [mc4wp.com/premium-features](https://www.mc4wp.com/premium-features/) | Free core. Premium $59/yr (1 site), $99 (5 sites), $249 (25 sites), USD. [mc4wp.com/pricing](https://www.mc4wp.com/pricing/) |
| **FluentCRM** | Self-hosted CRM in WP: 360° contact view, tags/lists, custom fields, "advanced segmentation" (behaviour/interest), companies module, broadcast campaigns, email sequences (drips), visual automation builder (triggers on sign-up, login, purchase, form submit etc.), abandoned cart recovery, recurring campaigns, newsletter archive pages, smart links, personalisation merge tags, SMS via Twilio/AWS, WhatsApp, AI contact summaries, 45+ integrations (Woo, Fluent Forms, MemberPress, LearnDash). Sends via your own SES/Mailgun etc. Unlimited contacts. [fluentcrm.com/features](https://fluentcrm.com/features/) | $129/yr (1 site), $249 (5), $499 (50), USD; 20% promo showing. Priced per site, not per contact. [fluentcrm.com/pricing](https://fluentcrm.com/pricing/) |
| **MailPoet** (Automattic) | Newsletter editor inside WP, forms, post/product blocks in emails, WooCommerce marketing emails (abandoned cart, first purchase etc.), automations, segmentation (paid), detailed engagement stats, GA link tagging, built-in MailPoet Sending Service (deliverability). [account.mailpoet.com](https://account.mailpoet.com/) | Starter free (500 subs, 5k emails/mo). At 500 subs: Creator $8/mo (own SMTP), Business $10/mo, Agency $30/mo; scales by list size. [ecommerceparadise.com/mailpoet-pricing](https://ecommerceparadise.com/mailpoet-pricing/) **[third-party, says checked Sept 2026]** |
| **Newsletter (Stefano Lissa)** | Free: unlimited subscribers, lists, custom fields, popup/inline/widget forms, double opt-in, GDPR privacy checkbox, anti-spam, drag-drop composer, open/click tracking, targeting by list combinations/custom fields/language. Paid add-ons: automated (post-digest) newsletters, autoresponders/series, WooCommerce/EDD, events plugin integrations, geolocation, advanced reports, ESP delivery (SES, SendGrid, Mailgun, Postmark), bounce management. [wordpress.org/plugins/newsletter](https://wordpress.org/plugins/newsletter/), [thenewsletterplugin.com/premium](https://www.thenewsletterplugin.com/premium) | Tiers Essential (1 site) / Professional (3) / Agency (unlimited), one-time with 1 yr updates. **Current prices not shown on page; last seen €69 / €269 (2022) [UNVERIFIED]** [omr.com](https://omr.com/en/reviews/product/the-newsletter-plugin/pricing) |
| **Groundhogg** | WP-native CRM: contacts, tags, drag-drop email, "Flows" automation, lead scoring, A/B testing, sales pipeline (Plus+), SMS, ecommerce and membership integrations, conditional logic (Pro+), white-label (Agency). Unlimited contacts. [groundhogg.io/pricing](https://www.groundhogg.io/pricing/) | $20/mo Basic, $40 Plus, $50 Pro, $100 Agency, billed annually, USD. |
| **Brevo plugin** | Forms with double opt-in (and gamified popups), SMTP for transactional WP/Woo email with open/click/bounce tracking, visual multi-channel automation (email, SMS, WhatsApp, push), welcome series / abandoned cart / win-back, Woo purchase sync, unique coupon codes in emails, ad-audience sync to Facebook/Google. [wordpress.org/plugins/mailin](https://wordpress.org/plugins/mailin/) | Brevo account: Free (300 emails/day); Starter; Standard (adds automation, A/B tests, send-time optimisation, landing page); Professional (contact scoring, popups, WhatsApp). The plugin page says "paid from $9/mo" **[exact tier prices not shown on the pricing page fetch]** [brevo.com/pricing](https://www.brevo.com/pricing/) |
| **Jetpack Newsletter** | Subscribe blocks, send posts as emails, paid subscriptions (paywall per post: everyone vs paid subscribers), reader choice of instant/daily/weekly digest, CSV import, subscriber stats. No list-size charge. [jetpack.com/newsletter](https://jetpack.com/newsletter/) | Free to send. Paid subscriptions take 10% (free plan) down to 2% (Complete plan) + Stripe fees. |
| **HubSpot WP plugin** | Embeds HubSpot: forms (embedded, pop-up, dropdown banner, slide-in), live chat and chatbots, email marketing with templates, CRM, analytics dashboards. Paid tiers add landing pages, lead scoring, A/B tests, attribution. [wordpress.org/plugins/leadin](https://wordpress.org/plugins/leadin/) | Free CRM/forms/chat. Marketing Hub Starter from $7/seat/mo (intro, reg $20), 1,000 contacts; Professional $800/mo + $3,000 onboarding. USD. [hubspot.com/pricing/marketing](https://www.hubspot.com/pricing/marketing) |

### B. Lead capture / popups

| Plugin | Marketing features | Price |
|---|---|---|
| **OptinMonster** (SaaS) | Lightbox popups, floating bars, inline, sidebar, slide-in, fullscreen, coupon wheel (Growth). Targeting: page-level, scroll/time triggers (all); A/B tests + device targeting (Plus); exit intent, smart tags (personalisation), referrer targeting, scheduling (Pro); geolocation, OnSite Retargeting (show different offer to returning/converted visitors), follow-up campaigns, adblock detection (Growth). Analytics, 30+ ESP integrations, Zapier. [optinmonster.com/pricing](https://optinmonster.com/pricing/) | Annual: Basic $7/mo ($210/yr regular), Plus $19, Pro $29, Growth $49/mo; capped by monthly impressions (2.5k to 100k). USD. |
| **Convert Pro** (Brainstorm Force) | Drag-drop popups, info bars, slide-ins, full-screen, inline; exit intent, on-click, scroll; page-level targeting, device and referrer detection, adblock detection; split (A/B) testing; GA integration; 30+ ESP integrations; unlimited sites. [convertpro.net/pricing](https://www.convertpro.net/pricing/) | $89/yr (reg $99) or $349 lifetime, USD. |
| **Popup Maker** | Unlimited popups, exit intent, scroll and event triggers, conditional logic targeting (user role, scheduling), analytics dashboard, CTA management, FluentCRM integration. Pro+: revenue attribution per popup, WooCommerce/EDD purchase-history targeting, ROI reports, LMS enrolment automation. [wppopupmaker.com/pricing](https://wppopupmaker.com/pricing/) | Free core. Pro $99/yr regular ($59.40 first year); Pro+ $249/yr ($149.40 first year). USD. |
| **Bloom** (Elegant Themes) | 6 opt-in types (popup, fly-in, inline, below content, widget, content locker), triggers (time delay, bottom of post, scroll %, after comment, after purchase, inactivity), per-post/category targeting, A/B split testing, conversion stats, 19 ESP integrations. [elegantthemes.com/plugins/bloom](https://www.elegantthemes.com/plugins/bloom/) | Only sold inside Elegant Themes membership: $89/yr or $249 lifetime (includes Divi, Monarch). USD. [elegantthemes.com/join](https://www.elegantthemes.com/join/) |
| **Hustle** (WPMU DEV) | Popups, slide-ins, embeds, social share bar with counters; smart triggers; targeting by location, device, behaviour; scheduling; conditional display; reCAPTCHA; per-module analytics; 50+ ESP integrations. [wpmudev.com/project/hustle](https://wpmudev.com/project/hustle/) | Free core. Pro $36/yr (1 site), $60 (3), $120 (10). USD. |
| **ConvertBox** (SaaS) | Targeted on-site messages by behaviour, device, location, referrer; dynamic text personalisation from visitor/CRM data; multi-step, multi-choice funnels, quizzes and surveys that segment visitors; countdown timers; A/B testing; 100+ integrations. [convertbox.com](https://convertbox.com/) | $495 one-time "early access" (quoted as regular $99/mo). USD. |

### C. Forms

| Plugin | Marketing features | Price |
|---|---|---|
| **Gravity Forms** | Conditional logic, multi-page, calculations. Basic: ESP add-ons (Mailchimp, HubSpot, ActiveCampaign, Brevo, Kit etc.). Pro: Stripe, PayPal, Square, Zapier, Slack, Twilio, Zoho/Agile CRM. Elite: Survey, Polls, Quiz, Coupons, Partial Entries (abandonment), Conversational Forms, User Registration, Signature, Geolocation, Google Analytics, Webhooks, Salesforce, Advanced Post Creation (form creates a WP post, e.g. a listing). [gravityforms.com/pricing](https://www.gravityforms.com/pricing/) | $59/yr (1 site), $159 Pro (3), $259 Elite (unlimited). USD. |
| **WPForms** | Conditional logic (all). Plus: ESP integrations, "smart workflows". Pro: surveys & polls, form abandonment, conversational forms, lead forms (multi-step), coupons, payments, Zapier, Google Sheets. Elite: Salesforce/HubSpot/Pipedrive, webhooks, entry automation. [wpforms.com/pricing](https://wpforms.com/pricing/) | Intro $49.50 / $99.50 / $199.50 / $299.50 per yr (regular $99 to $599). USD. |
| **Fluent Forms** | All features in all tiers: conditional logic, multi-step, conversational forms, quiz and survey with scoring and reporting, partial entries, double opt-in, coupon codes, payments/subscriptions, inventory limits, 60+ integrations (Mailchimp, HubSpot, Brevo, FluentCRM, Sheets, Salesforce), landing pages, PDF reports. [fluentforms.com/features](https://fluentforms.com/features/) | $79/yr (1 site), $159 (5), $299 (unlimited); lifetime $349 to $899. 20% promo showing. USD. [fluentforms.com/pricing](https://fluentforms.com/pricing/) |

### D. SEO

| Plugin | Marketing features | Price |
|---|---|---|
| **Yoast SEO** | Free: content (keyphrase) and readability analysis, XML sitemaps, basic schema graph. Premium: redirect manager (auto-prompt on move/delete, CSV bulk), up to 5 keyphrases with synonyms/word forms, AI titles/meta, internal linking suggestions, orphaned content report, Facebook/X preview control. Premium now bundles Local SEO, Video SEO and News SEO. [yoast.com/wordpress/plugins/seo](https://yoast.com/wordpress/plugins/seo/) | Premium $118.80/yr per site, excl. VAT, USD. |
| **Rank Math** | Schema generator (custom JSON-LD, many schema types), Local SEO (multi-location), redirects (301/302/307/410/451), 404 monitor, broken links, rank tracking (1k to 75k keywords), GA4 and Search Console dashboards, internal linking suggestions, sitemaps, SEO score, Content AI (credits). [rankmath.com/pricing](https://rankmath.com/pricing/) | PRO €6.99/mo, Business €22.99/mo, Agency €52.99/mo, billed annually. **EUR.** |
| **AIOSEO** | TruSEO on-page analysis, smart schema (event schema on Pro), XML/RSS sitemaps (video/news on Pro), Local SEO (Plus+), author SEO (Plus+), redirects with 404 log (Pro+), link assistant with orphan reports (Pro+), Search Statistics with rank tracking and content-decay alerts (Elite), AI credits. [aioseo.com/pricing](https://aioseo.com/pricing/) | Intro $49.50 / $99.50 / $199.50 / $299.50 per yr (regular $99 to $599). USD. |

### E. Referral / affiliate / coupons

| Plugin | Marketing features | Price |
|---|---|---|
| **AffiliateWP** | Referral links, coupon-based attribution, affiliate self-service dashboard, payouts (Stripe, PayPal, store credit), multi-currency, sign-up bonuses, leaderboards, fraud prevention, lifetime and recurring commissions, multi-tier, affiliate landing pages, personalised URLs, auto payouts. Sister product RewardsWP handles customer refer-a-friend. [affiliatewp.com/pricing](https://affiliatewp.com/pricing/) | Intro $149.50 / $199.50 / $299.50 per yr (regular $299 to $599). USD. |
| **ReferralCandy** (SaaS, supports WooCommerce) | Customer refer-a-friend campaigns, custom coupon codes, cash or store-credit rewards, Klaviyo etc. integrations, API. [referralcandy.com/pricing](https://www.referralcandy.com/pricing) | $39/mo + 10.5% of referred first 3 orders; $79 + 3.5%; $249 + 1.5%; $799 + 0.25%. USD (shown as $). |
| **Solid Affiliate** | Unlimited affiliates, first-party cookie tracking, link generator, affiliate groups, PayPal one-click payouts, store credit, sign-up bonuses; Pro adds white-label portal, custom registration and email notifications, coupon links, lifetime commissions, subscription renewals, fraud suite, landing pages. [solidaffiliate.com/pricing](https://solidaffiliate.com/pricing/) | Intro $149.60 / $174.65 / $224.70 per yr (regular $374 to $749). USD. |
| **Advanced Coupons** | For WooCommerce: BOGO, cart conditions (customer status, spend, category), scheduling (date and weekday), URL coupons, auto-apply, "one-click apply" notices, store credit with reminder emails, bulk unique codes (virtual coupons), cashback, subscription coupons. Bundle adds Loyalty Program, Gift Cards, Promo Kit. [advancedcouponsplugin.com/pricing](https://advancedcouponsplugin.com/pricing/) | Intro $99.50 (1 site) / $199.50 (unlimited) / $249 all-access per yr. USD. |
| **WooCommerce core coupons** | Percentage, fixed cart, fixed product; min/max spend; product/category include/exclude; allowed emails (wildcards); individual-use; exclude sale items; total and per-customer usage limits; expiry date; free shipping. [woocommerce.com/document/coupon-management](https://woocommerce.com/document/coupon-management/) | Free. |
| **Smart Coupons** (StoreApps) | Gift cards, store credit, bulk unique codes (CSV export or email), URL coupons that can add products to cart, auto-apply, BOGO, restrictions by location/payment/shipping/role/order history, email coupons. [woocommerce.com/products/smart-coupons](https://woocommerce.com/products/smart-coupons/) | $129/yr, USD. |

### F. Reviews / social proof

| Plugin | Marketing features | Price |
|---|---|---|
| **Site Reviews** | Review forms assignable to posts, CPTs (e.g. listings) or users; star summaries; owner responses; moderation queue; JSON-LD schema; CAPTCHA and anti-spam; email/Slack/Discord notifications; review verification requests; CSV import; REST API. Premium add-ons: custom review forms, images, filters, themes (carousel/grid), author profiles, "Review Notifications" (scheduled conditional emails after a review), upvoting, reporting. [wordpress.org/plugins/site-reviews](https://wordpress.org/plugins/site-reviews/) | Free core. Premium €89/yr (1 site), €179 (3), €289 (6). **EUR.** [niftyplugins.com](https://niftyplugins.com/plugins/site-reviews-premium/) |
| **WP Customer Reviews** | Moderated reviews/testimonials, Schema.org markup for star snippets, custom fields, admin replies, business or product review types. [wordpress.org/plugins/wp-customer-reviews](https://wordpress.org/plugins/wp-customer-reviews/) | Free, no paid tier listed. |
| **Trustindex (Widgets for Google Reviews)** | Free: show up to 10 Google reviews, 40+ layouts, filter by rating. Pro: all reviews from Google, Facebook, Yelp, Tripadvisor etc., unlimited widgets, photos, tagging and moderation, automated review-invitation emails, social image generation, stats. [wordpress.org/plugins/wp-reviews-plugin-for-google](https://wordpress.org/plugins/wp-reviews-plugin-for-google/) | Free core. **Pro price not verified** (pricing page returned 404). |
| **TrustPulse** (SaaS) | Real-time "someone just signed up / bought" notifications, "on fire" aggregate counts, page targeting, analytics. [seedprod.com/trustpulse-review](https://www.seedprod.com/trustpulse-review/) | From $9/mo for 2,500 sessions **[third-party; vendor page timed out]** |
| **NotificationX** | 15+ notification types (sales, sign-ups, reviews, Google Reviews alerts, download counts, growth alerts), notification bar with countdown, exit-intent popups, flashing browser tab, discount alerts, cross-domain notices, analytics. [notificationx.com/pricing](https://notificationx.com/pricing/) | Free core. $39/yr (1 site), $149 (unlimited), $249 lifetime. USD. |

### G. Social sharing / scheduling

| Plugin | Marketing features | Price |
|---|---|---|
| **Blog2Social** | Auto-post new posts, scheduling, "Best Time Manager", re-share queue, drag-drop social calendar, per-network post customisation, URL shortener, up to 24–25 networks incl. Google Business Profile (Pro). [en.blog2social.com/pricing](https://en.blog2social.com/pricing/) | Free (12 networks). Smart €8.99/mo, Pro €14.99, Business €24.99, billed yearly. **EUR.** |
| **Revive Social / Revive Old Posts** | Auto-share new posts and recycle old ones on a schedule to Facebook, X, LinkedIn, Google Business, Tumblr, Mastodon; per-network messages, auto hashtags, UTM/GA click tracking, message variations, share Woo products/CPTs. [revive.social/plugins/revive-old-post](https://revive.social/plugins/revive-old-post/) | Starter 99 / Business 199 / Marketer 399 per yr. **Currency shown ambiguously on page ("€$"); likely USD [UNVERIFIED].** |
| **Social Snap** | Share buttons (34 networks), follow buttons, click-to-tweet, OG/Twitter meta; Pro adds auto-poster, "Boost Old Posts", share-count recovery, social login, content locker, analytics. [socialsnap.com/pricing](https://socialsnap.com/pricing/) | $39/yr, $99 (3 sites, all add-ons), $299 (15). USD. |
| **Novashare** | Lightweight share buttons, share counts, Pinterest features, click-to-tweet, share analytics. [novashare.io/pricing](https://novashare.io/pricing/) | $19.95 / $49.95 / $99.95 per yr. USD. |
| **Hustle** (also here) | Floating share bar with counters. See B. | |
| **Monarch** | Share buttons, included in Elegant Themes membership. [elegantthemes.com/join](https://www.elegantthemes.com/join/) | With membership ($89/yr). |

### H. A/B testing and analytics

| Plugin | Marketing features | Price |
|---|---|---|
| **Nelio A/B Testing** | Tests on pages, posts, headlines, templates, themes, widgets, menus, CSS, JS, Woo products; heatmaps, scrollmaps, session recordings (paid); multiple goals; visitor segmentation; scheduling; AI test suggestions; quota by "tested page views". [neliosoftware.com/testing/pricing](https://neliosoftware.com/testing/pricing/) | Free 500 tested views/mo. Basic $24/mo (5k), Professional $74/mo, Enterprise $214/mo **[prices from TrustRadius, not vendor page]** [trustradius.com](https://www.trustradius.com/products/nelio-ab-testing/pricing) |
| **MonsterInsights** | GA4 in WP: dashboards, real-time, scroll/download/video tracking, popular-posts widgets, headline analyser (Plus); ecommerce, form conversion tracking, user journey (Pro); UserFeedback surveys, heatmaps, NPS (Elite); AI insights (Agency); EU compliance tools. [monsterinsights.com/pricing](https://www.monsterinsights.com/pricing/) | Intro $99.50 / $199.50 / $299.50 / $399.50 per yr (regular $199 to $799). USD. |
| **Site Kit by Google** | Search Console, GA4, AdSense, PageSpeed, Tag Manager, Google Ads, Reader Revenue Manager, Sign in with Google in the WP dashboard; per-page stats; recent "Site Goals" tracking. 5M+ installs. [wordpress.org/plugins/google-site-kit](https://wordpress.org/plugins/google-site-kit/) | Free. |

### I. Announcement bars, banners, ad management

| Plugin | Marketing features | Price |
|---|---|---|
| **Advanced Ads** | Unlimited ads; placements (auto-inject after N paragraphs, sticky, popup/layer, background, parallax); display conditions (post type, category, age, author, URL params); visitor conditions (device, logged-in, role, language, referrer, cookie); geo-targeting (radius); rotation and A/B tests; impression/click tracking; start/expiry scheduling; advertiser performance reports; "Selling Ads" add-on lets advertisers buy placements on the front end. [wpadvancedads.com/features](https://wpadvancedads.com/features/) | Free core. Pro €59/yr; All Access €89 (1 site), €129 (5). **EUR.** [wpadvancedads.com/pricing](https://wpadvancedads.com/pricing/) |
| **AdRotate** | Ad groups with rotation, geo-targeting (country/state/city), scheduling by date/time/weekday with impression/click caps, click/impression stats, advertiser dashboard with admin approval, device-specific ads. [ajdg.solutions](https://ajdg.solutions/product/adrotate-pro-single/) | Free core. Pro €49 single site (reg €59). **EUR.** |
| **WP Notification Bars** (MyThemeShop) | Unlimited top bars, CTA button, colours, show on home/posts/pages, show by referrer (Google/Facebook). **Not updated for ~5 years; untested with the last 3 WP releases.** [wordpress.org/plugins/wp-notification-bars](https://wordpress.org/plugins/wp-notification-bars/) | Free. Pro price **not verified**. |
| (Also bars in OptinMonster, Convert Pro, NotificationX, Hustle, HubSpot) | | |

### J. Directory plugins (monetisation and marketing)

| Plugin | Marketing / monetisation features | Price |
|---|---|---|
| **GeoDirectory** | Pricing Manager: unlimited paid packages, recurring payments, free trials, per-package feature limits (images, website link, phone), featured placement, expiry dates, renewal reminders. Claim Listings: claim button/lightbox, auto-approve by email verification or payment, admin approval, emails to admin and claimant, "Pay to Claim" (start free, pay to unlock), "Verified" badge and filter. Also add-ons for multi-ratings/reviews, events, franchises, advertising. [wpgeodirectory.com/downloads/pricing-manager](https://wpgeodirectory.com/downloads/pricing-manager/), [claim-listings](https://wpgeodirectory.com/downloads/claim-listings/) | Core free. Each add-on $49/$69/$99 per yr. Membership (all add-ons + themes) $139/yr 1 site, $229/yr unlimited. USD. [membership](https://wpgeodirectory.com/downloads/membership/) |
| **Directorist** | Pricing plans (recurring, PayPal/Stripe or WooCommerce), claim listing, featured listings, ads manager, coupons, multi-criteria reviews, verified and custom badges, compare listings, business hours, live chat, booking. Email templates: submitted, approved, edited, **renewal reminder before expiry**, expired, renewed, contact-form message to owner, new review, order/payment. **Announcements** to all or selected users (dashboard + optional email, with expiry). [directorist.com/pricing](https://directorist.com/pricing/), [email templates](https://directorist.com/docs/email-customization/), [announcements](https://directorist.com/documentation/directorist/advanced-settings/sending-announcements/) | Core free. $116 / $135 / $153 per yr (1 / 5 / unlimited sites), lifetime $379 to $749. USD. |
| **HivePress** | Free: Claim Listings (paid claim), Reviews, Messages, Favorites, Geolocation. Paid ($29–$39 each): Memberships, Marketplace, Bookings, Requests, **Search Alerts** (notify users about new listings), Social Links, Tags, **Statistics** (owner listing stats). Paid Listings extension for packages/featured. [hivepress.io/extensions](https://hivepress.io/extensions/) | Core free. All extensions $99/yr (reg $398). USD. |
| **Business Directory Plugin** | Fee plans, featured/premium upgrade levels, recurring renewals, discount codes (percent or fixed, with expiry), claim listings (Elite), plan restrictions, ratings with rich snippets, abandoned-payment tracking, CSV import. [businessdirectoryplugin.com/features](https://businessdirectoryplugin.com/features/) | $99 / $149 / $249 per yr (reg $149 to $349). USD. [pricing](https://businessdirectoryplugin.com/pricing/) |
| **Voxel** (theme + plugin) | Paid listings (one-off or subscription), paid memberships, **Promoted posts** (sell time-limited ranking boosts), claim listing with fee, Stripe Connect marketplace with commissions, timeline/followers, reviews via timeline, collections, direct messages, "app events" in-site and email notifications. [getvoxel.io/features](https://getvoxel.io/features/) | $59/yr (1 site); $249 lifetime (5 sites); $499 lifetime unlimited. USD. [pricing](https://getvoxel.io/pricing/) |
| **JetEngine (Crocoblock)** | Toolkit rather than a directory product: custom post types, listings grids, dynamic visibility, profile builder, relations; combined with JetFormBuilder, JetReviews, JetBooking, JetAppointment, JetCompareWishlist, JetPopup. Monetisation is assembled by hand (e.g. with WooCommerce). [crocoblock.com/pricing](https://crocoblock.com/pricing/) | All-Inclusive $199/yr (1 site), $999 lifetime. USD. |
| **WP Job Manager** | Core: front-end submission, listing expiry/duration, featured flag. Add-ons: Simple Paid Listings (Stripe/PayPal pay-to-post), WC Paid Listings (packages, featured packages, subscriptions, fixed duration), Job Alerts (saved-search emails), Applications, Bookmarks, Application Deadline, Resume Manager. [wpjobmanager.com/add-ons/wc-paid-listings](https://wpjobmanager.com/add-ons/wc-paid-listings/) | Core free. Core add-on bundle "from $159/yr". USD. Single add-on prices not shown. [simple-paid-listings](https://wpjobmanager.com/add-ons/simple-paid-listings/) |

### K. Membership / automation

| Plugin | Marketing features | Price |
|---|---|---|
| **MemberPress** | Coupons with trials, upgrade/downgrade, automated reminder emails (expiring, renewal, abandoned sign-up), paywall with metered access, drip content, courses, member directories/forums (ClubSuite), CoachKit, Easy Affiliate (Scale), gifting and corporate accounts (Scale), ESP integrations, Zapier/webhooks (Scale). [memberpress.com/pricing](https://memberpress.com/pricing/) | Intro $199.50 / $349.50 / $499.50 per yr (regular $399 to $999); Launch tier adds 4.9% transaction fee. USD. |
| **Paid Memberships Pro** | Free core plus add-ons: discount codes, email confirmation, extra expiration-warning emails, abandoned cart recovery, lightweight affiliates, gift memberships, sitewide sales (time-boxed sale campaigns with banners), member directory/profiles, member badges, drip series, signup shortcode, Mailchimp/Kit/MailerLite sync, GA. [paidmembershipspro.com/add-ons](https://www.paidmembershipspro.com/add-ons/) | Free. Standard $49/mo or $499/yr (all premium add-ons); Max hosting $99+/mo. USD. [pricing](https://www.paidmembershipspro.com/pricing/) |
| **Uncanny Automator** | "Recipes": trigger → conditions → actions across 10,000+ triggers/actions and many plugins/apps; delays and scheduling, loops, webhooks, database queries; AI agent and page builder. [automatorplugin.com/pricing](https://automatorplugin.com/pricing/) | Free core. $240 / $360 / $480 per yr. USD. |
| **AutomatorWP** | Same pattern (triggers/actions across plugins, incl. anonymous-user automations), all add-ons in each pass. [automatorwp.com/pricing](https://automatorwp.com/pricing/) | Free core. $149 / $249 / $499 per yr. USD. |

---

## Part 2: Consolidated feature taxonomy

Legend:
- **Prevalence**: how many of the ~50 plugins surveyed provide it. *Very common* (15+), *Common* (6–14), *Some* (3–5), *Rare* (1–2).
- **Tier**: **TS** = table stakes (expected in any serious tool in that category); **ADV** = advanced / differentiator.
- **Done well by**: the plugins that stand out.
- **EPA note**: how it maps to the brief (existing = already built/planned per brief).

### 1. Audience and contacts

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Central contact record with custom fields | Common | TS | FluentCRM, Groundhogg, HubSpot | Riders + providers tables exist; worth a unified "person" view in admin |
| Activity timeline per contact (opens, clicks, forms, purchases, page views) | Some | ADV | FluentCRM (360° view), HubSpot, Groundhogg | Could join the existing analytics event table to riders |
| Tags and static lists | Very common | TS | FluentCRM, Newsletter, MailPoet, Groundhogg | Cheap to build |
| Import/export CSV | Very common | TS | Newsletter, Jetpack, FluentCRM | |
| Two-way sync of site users ↔ list | Common | TS | MC4WP (User Sync), MailPoet, FluentCRM | Native in EPA since Supabase is the list |
| Companies / accounts (B2B) | Rare | ADV | FluentCRM, HubSpot | Clinic-tier providers could be "companies" |
| Lead scoring / contact scoring | Some | ADV | Groundhogg, HubSpot (paid), Brevo Professional | Low value at EPA scale |
| AI contact summary | Rare | ADV | FluentCRM, HubSpot | Skip |

### 2. Segmentation

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Segment by list/tag/custom field | Very common | TS | Newsletter (list combinations: all in / any / not in), MailPoet (paid) | Area + profession + role are the natural segments |
| Dynamic (rule-based, auto-updating) segments | Common | TS in CRMs | FluentCRM, MailPoet Business, Brevo | Build as saved SQL filters |
| Behavioural segments (clicked X, visited page, purchased) | Some | ADV | FluentCRM, Brevo, MC4WP (Woo purchase data to Mailchimp) | Event table makes this feasible |
| Engagement segments (inactive, never opened) | Some | ADV | MailPoet, FluentCRM | Useful for list hygiene |
| Geo segmentation | Some | ADV | Newsletter (geolocation add-on), OptinMonster, Advanced Ads | EPA already has area data from profile/alerts |

### 3. Broadcast campaigns (email)

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Drag-drop / block email editor with templates | Very common | TS | MailPoet, FluentCRM, Newsletter, Brevo | Admin already edits email templates |
| Dynamic content blocks (latest posts/products/listings) | Common | TS | MailPoet (post/product blocks), Newsletter (automated add-on), Jetpack | "New events/providers near you" block is the EPA equivalent |
| Scheduled sends | Very common | TS | all ESP plugins | |
| Post-to-email / digest (instant, daily, weekly, reader's choice) | Some | TS for publishers | Jetpack Newsletter (reader picks frequency), Newsletter automated add-on | Close to rider_alerts |
| Recurring campaigns (RSS-style) | Some | ADV | FluentCRM, Newsletter | Monthly rider and provider emails already planned |
| Personalisation merge tags | Very common | TS | all | |
| Conditional content inside one email | Some | ADV | FluentCRM, HubSpot | |
| Email A/B tests (subject/content) | Some | ADV | Groundhogg, HubSpot (paid), Brevo Standard | Low value at small list sizes |
| Send-time optimisation | Rare | ADV | Brevo Standard | Skip |
| Public newsletter archive pages | Some | ADV | FluentCRM, Jetpack | Cheap SEO content |
| Paid newsletter / paywall | Rare | ADV | Jetpack, MemberPress | Not relevant |

### 4. Automations / drips

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Welcome / onboarding sequence | Very common | TS | FluentCRM, MailPoet, Brevo, Groundhogg | Provider onboarding drip (complete profile, add photo, add event) is high value, low hours |
| Visual workflow builder (trigger → wait → condition → action) | Common | TS in CRMs | FluentCRM, Groundhogg Flows, Brevo, Uncanny Automator | A code-defined sequence engine is enough; a visual builder is expensive |
| Event triggers from other plugins (form submit, purchase, login, membership change) | Common | TS | Uncanny Automator (10k+), AutomatorWP, FluentCRM | EPA has these events natively |
| Abandoned cart / abandoned sign-up recovery | Common | TS in ecommerce | FluentCRM, MailPoet, Brevo, MemberPress, PMPro, BDP (abandoned payment) | Abandoned Stripe checkout / half-finished provider sign-up nudge |
| Expiry / renewal reminders | Common in membership/directory | TS | MemberPress, PMPro (extra expiration warnings), Directorist (renewal reminder), GeoDirectory | Relevant: founding-offer end, card expiring, annual renewal |
| Win-back / re-engagement | Some | ADV | Brevo, FluentCRM | Dormant riders |
| Goals/benchmarks that exit a contact from a sequence | Some | ADV | FluentCRM, Groundhogg | Stop onboarding emails once profile complete |
| Multi-channel steps (SMS, WhatsApp, push) | Some | ADV | Brevo, FluentCRM, Groundhogg Pro | Skip |
| Webhooks / Zapier out | Common | TS | Gravity Forms Elite, WPForms Elite, Uncanny, MemberPress Scale | |

### 5. Forms and lead capture

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Sign-up forms (inline, widget, shortcode) | Very common | TS | MC4WP, Newsletter, MailPoet, all form plugins | |
| Auto-insert forms after content by category | Some | ADV | MC4WP, Bloom | Rider sign-up after area/profession pages |
| Double opt-in and consent checkbox | Very common | TS | Newsletter, Brevo, Fluent Forms, MailPoet | Spam Act: consent record matters |
| Conditional logic | Very common | TS | Gravity Forms, WPForms, Fluent Forms | |
| Multi-step / conversational forms | Common | ADV | Fluent Forms, WPForms Pro, Gravity Elite | |
| Partial entries / form abandonment capture | Some | ADV | Gravity Elite, WPForms Pro, Fluent Forms | Useful on provider sign-up |
| Surveys, polls, NPS | Common | ADV | Gravity Survey/Polls, WPForms Pro, Fluent Forms, MonsterInsights UserFeedback | A one-question rider poll in email is cheap |
| Quizzes that segment (e.g. "which professional do you need?") | Some | ADV | ConvertBox, Fluent Forms, Gravity Quiz | Could route riders to a profession door |
| Form creates a record (e.g. listing) | Some | ADV | Gravity Advanced Post Creation, directory plugins | Native in EPA |
| Lead/enquiry form on each listing, emailed to owner | Common in directories | TS | Directorist, GeoDirectory, HivePress (messages), Voxel (DMs) | enquiry_sent exists |
| Team notification on new lead | Very common | TS | all form plugins, MC4WP | |

### 6. Popups, bars and on-site messaging

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Popup / slide-in / inline opt-in | Very common | TS | OptinMonster, Convert Pro, Popup Maker, Bloom, Hustle | |
| Announcement / notification bar with CTA | Very common | TS | OptinMonster, NotificationX, HubSpot, Convert Pro | Cheap to build: one content_block + dismiss cookie |
| Countdown timer bar | Some | ADV | NotificationX, ConvertBox | Founding offer deadline |
| Triggers: time, scroll %, exit intent, click, inactivity | Very common | TS (exit intent often paid tier) | OptinMonster, Bloom, Convert Pro, Popup Maker | |
| Page/category targeting | Very common | TS | all | |
| Device, referrer, UTM targeting | Common | ADV | OptinMonster Pro, Convert Pro, WP Notification Bars (referrer) | Hide for Kim's invite traffic, show to organic |
| Geo targeting | Some | ADV | OptinMonster Growth, Hustle, Advanced Ads | |
| Returning-visitor / already-subscribed suppression (onsite retargeting) | Some | ADV | OptinMonster Growth, ConvertBox | Important to avoid nagging logged-in riders |
| Frequency capping / scheduling | Common | TS | OptinMonster, Hustle, Popup Maker | |
| Content locker / gated content | Some | ADV | Bloom, Social Snap | |
| Social-proof toasts ("X just joined") | Some | ADV | TrustPulse, NotificationX | Honest-numbers rule: only real, aggregate events |
| Live chat / chatbot | Rare | ADV | HubSpot | Skip |

### 7. Personalisation

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Merge tags in email | Very common | TS | all ESPs | |
| Dynamic text on site (name, location, referrer) | Some | ADV | OptinMonster smart tags, ConvertBox | Area-aware homepage copy |
| Different offer by segment / behaviour | Rare | ADV | ConvertBox, OptinMonster, Popup Maker Pro+ (purchase history) | |

### 8. Coupons and promotions

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Percent / fixed discount codes with expiry and usage limits | Very common | TS | Woo core, BDP discount codes, MemberPress, PMPro, WPForms/Fluent/Gravity coupons | Stripe Coupons/Promotion Codes do this natively |
| Free trials | Common | TS | MemberPress, PMPro, GeoDirectory Pricing Manager | Founding offer is effectively a trial + locked price |
| Restrictions (first purchase only, specific plan, email domain) | Common | TS | Woo core, Smart Coupons, Advanced Coupons | Stripe supports first-time-only and per-product |
| URL / auto-apply coupons | Some | ADV | Advanced Coupons, Smart Coupons | Kim's invite link could auto-apply a code |
| Bulk unique codes | Some | ADV | Smart Coupons, Advanced Coupons, Brevo | Per-event or per-association codes |
| Scheduled promotions / sitewide sales with banner | Some | ADV | PMPro Sitewide Sales, Advanced Coupons scheduling | |
| Store credit, gift cards, loyalty points, BOGO, cashback | Some | ADV (ecommerce) | Smart Coupons, Advanced Coupons | Mostly irrelevant to flat subscriptions; gift subscriptions possible |

### 9. Referral and affiliate

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Referral links with cookie attribution | Common | TS | AffiliateWP, Solid Affiliate, ReferralCandy, PMPro Affiliates | ref/utm into acquisition_source already exists |
| Coupon-code attribution | Common | TS | AffiliateWP, Solid Affiliate, ReferralCandy | |
| Self-service referrer dashboard (my link, my referrals, earnings) | Common | TS | AffiliateWP, Solid Affiliate | "Invite a colleague" page for providers |
| Rewards as store credit / account credit | Some | ADV | AffiliateWP, ReferralCandy, Solid | Reward = free month (Stripe credit), not cash commission |
| Customer refer-a-friend (two-sided reward) | Some | ADV | ReferralCandy, RewardsWP | Provider-refers-provider fits community-led growth |
| Recurring / lifetime / multi-tier commissions, payouts | Some | ADV | AffiliateWP Pro, Solid Pro | Not needed |
| Fraud checks (self-referral) | Some | ADV | AffiliateWP Pro, Solid Pro | Simple rules suffice |
| Leaderboards | Rare | ADV | AffiliateWP Plus | |

### 10. Reviews and social proof

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Star reviews on listings with moderation | Very common in directories | TS | Site Reviews, WP Customer Reviews, Directorist, GeoDirectory, HivePress | Review queue exists |
| Owner reply to review | Common | TS | Site Reviews, WP Customer Reviews | |
| Review schema (rich snippets) | Common | TS | Site Reviews, WP Customer Reviews, BDP ratings | Google restricts self-serving review snippets for the site's own business, but listings of third parties are generally eligible; check current Google policy |
| Multi-criteria ratings | Some | ADV | Directorist, GeoDirectory | |
| Review images, filters, carousels | Some | ADV | Site Reviews Premium | |
| Review request / invitation emails | Some | ADV | Trustindex Pro, Site Reviews (verification requests) | High value: prompt riders after an enquiry |
| Post-review follow-up emails | Rare | ADV | Site Reviews Premium (Review Notifications) | |
| Import external reviews (Google etc.) | Some | ADV | Trustindex, Site Reviews (CSV) | Displaying a provider's Google rating is possible but adds API and ToS work |
| Live activity notifications | Some | ADV | TrustPulse, NotificationX | Keep honest |
| Badges: verified / featured / new / popular | Common in directories | TS | Directorist, GeoDirectory (Verified via claim), PMPro member badges | Brief forbids "verified" unless checked |

### 11. Social sharing and scheduling

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Share buttons + OG/Twitter meta | Very common | TS | Novashare, Social Snap, Hustle, Monarch, all SEO plugins (OG meta) | Next.js metadata + share links |
| Share counts / recovery | Some | ADV | Social Snap, Novashare | Skip |
| Auto-post new content to social | Common | TS | Blog2Social, Revive Social, Social Snap Pro | Could auto-post new events to a Facebook Page; Facebook Groups can't be posted to by API |
| Recycle evergreen content on schedule | Some | ADV | Revive Old Posts, Social Snap "Boost Old Posts", Blog2Social re-share | |
| Social calendar / best-time scheduling | Some | ADV | Blog2Social | |
| UTM tagging on shared links | Some | TS | Revive Social | Cheap and useful |
| Auto hashtags / message variations | Rare | ADV | Revive Social | |
| Click-to-tweet, follow buttons, social login | Some | ADV | Social Snap, Novashare | Skip |

### 12. SEO

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Meta title/description control + social previews | Very common | TS | Yoast, Rank Math, AIOSEO | Admin can edit via content_blocks |
| XML sitemaps (incl. news/video) | Very common | TS | all three | Next.js sitemap.ts |
| Schema / structured data (LocalBusiness, Person, Event, Review, FAQ, Breadcrumb) | Very common | TS | Rank Math (custom builder), AIOSEO, Yoast | Event + LocalBusiness/ProfessionalService on profiles are the wins |
| Local SEO (locations, opening hours, maps) | Common | TS/ADV | Yoast (now bundled), Rank Math, AIOSEO Plus | Per-area pages already planned |
| Redirect manager + 404 monitor | Common | TS | Rank Math, AIOSEO Pro, Yoast Premium | Needed when slugs change (provider renames) |
| On-page content analysis / keyphrase scoring | Very common | TS | Yoast, AIOSEO TruSEO, Rank Math | Low value for templated pages |
| Internal linking suggestions / orphan reports | Common | ADV | Yoast Premium, AIOSEO Pro, Rank Math | Auto-linking area ↔ profession pages is structural in EPA |
| Search Console dashboards, rank tracking, content decay | Some | ADV | Rank Math, AIOSEO Elite, Site Kit | Weekly SEO digest already planned |
| Broken link checker | Some | ADV | Rank Math, AIOSEO (separate) | |
| AI titles/meta | Common | ADV | Yoast, Rank Math, AIOSEO | |

### 13. Ad and banner management (house ads / sponsorship)

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Banner slots with placements (in-content, sidebar, sticky) | Some | TS in ad plugins | Advanced Ads, AdRotate | Featured slots exist; sponsor banners are a possible revenue line |
| Display/visitor conditions (page type, category, device) | Some | TS | Advanced Ads | |
| Scheduling with start/expiry, impression/click caps | Some | TS | AdRotate, Advanced Ads | |
| Rotation and A/B of creatives | Some | ADV | Advanced Ads, AdRotate | |
| Impression/click tracking + advertiser reports | Some | ADV | Advanced Ads Tracking, AdRotate | "Your numbers" email already a similar pattern |
| Self-serve ad purchase by advertisers | Rare | ADV | Advanced Ads Selling Ads, AdRotate advertiser dashboard, Directorist ads manager | Probably unnecessary |
| Geo-targeted ads | Some | ADV | Advanced Ads, AdRotate | Area-sponsored banners |

### 14. Directory monetisation (listing-specific)

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Paid listing plans / packages with feature limits | Very common in directories | TS | GeoDirectory Pricing Manager, Directorist, BDP, Voxel, WP Job Manager WC Paid Listings | Built (Stripe tiers) |
| Recurring billing + free trials | Common | TS | GeoDirectory, Directorist, BDP, Voxel | Built |
| Featured / sticky listing | Very common | TS | all directory plugins | Built (capped, labelled) |
| Time-limited promotion / boost | Rare | ADV | Voxel Promoted Posts | Conflicts with "never sell organic ranking"; only if clearly labelled as featured |
| Claim listing (with verification, pay-to-claim) | Common | TS | GeoDirectory, Directorist, HivePress, BDP Elite, Voxel | Brief forbids pre-created unclaimed profiles, so claim flow is mostly moot |
| Listing expiry + renewal reminder emails | Common | TS | Directorist, GeoDirectory, WP Job Manager, BDP | Map to subscription renewal/failed-payment emails |
| Owner listing statistics | Some | ADV | HivePress Statistics | Monthly "your numbers" email planned |
| Saved-search / new-listing alerts for users | Some | ADV | HivePress Search Alerts, WP Job Manager Job Alerts | rider_alerts planned |
| Favourites / collections | Common | TS | HivePress, Voxel, JetCompareWishlist | Also gives a reason to log in |
| Compare listings | Some | ADV | Directorist, GeoDirectory | Low value |
| Admin announcements to all/selected users | Rare | ADV | Directorist Announcements | Cheap: segmented broadcast to providers |
| Messaging between users and listings | Common | TS | HivePress, Voxel, Directorist live chat | Enquiry exists |
| Bookings / appointments | Some | ADV | Directorist, HivePress, JetBooking | Out of scope |

### 15. A/B testing and experimentation

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| A/B test popups/forms | Common | TS in popup tools | OptinMonster, Convert Pro, Bloom, ConvertBox | Traffic too low for significance early on |
| A/B test pages/headlines/templates | Rare | ADV | Nelio | Skip at EPA traffic |
| Heatmaps, scrollmaps, session recordings | Some | ADV | Nelio, MonsterInsights Elite | Use a free tool (e.g. Microsoft Clarity) instead of building |
| Email subject A/B | Some | ADV | Groundhogg, HubSpot, Brevo | Skip |
| Ad creative rotation tests | Some | ADV | Advanced Ads | |

### 16. Analytics and attribution

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Traffic dashboard in admin | Very common | TS | Site Kit, MonsterInsights | |
| Campaign stats (opens, clicks, bounces, unsubscribes) | Very common | TS | all ESPs | Resend provides webhooks for these |
| Form / popup conversion rates | Common | TS | OptinMonster, Popup Maker, WPForms, Fluent Forms | |
| UTM capture and source attribution | Some | TS | MonsterInsights, Revive Social, OptinMonster | acquisition_source exists |
| Revenue attribution per campaign/popup | Rare | ADV | Popup Maker Pro+, HubSpot Pro, MonsterInsights ecommerce | Signup → paid attribution by source is enough |
| User journey report (pages before conversion) | Rare | ADV | MonsterInsights Pro | |
| Scheduled email summaries of stats | Some | ADV | MonsterInsights, Site Kit | Weekly digest planned |
| Popular-content widgets | Some | ADV | MonsterInsights | |
| Search Console integration | Common | TS | Site Kit, Rank Math, AIOSEO | Built/planned |

### 17. Deliverability and compliance

| Capability | Prevalence | Tier | Done well by | EPA note |
|---|---|---|---|---|
| Unsubscribe link + one-click list-unsubscribe | Very common | TS | all ESPs | Spam Act requirement |
| Preference centre (per-topic opt-in/out, frequency) | Some | ADV | FluentCRM, Jetpack (frequency choice), MailPoet | High value: rider picks areas/professions/frequency |
| Double opt-in, consent logging with timestamp/source | Very common | TS | Newsletter, Brevo, MC4WP (log), Fluent Forms | Store consent source per contact |
| Bounce and complaint handling, auto-suppression | Common | TS | Newsletter (add-on), MailPoet sending service, Brevo | Resend webhooks → suppress |
| Transactional SMTP routing + domain auth (SPF/DKIM/DMARC) | Common | TS | Brevo, MailPoet, FluentCRM (via SES etc.) | Resend already |
| Spam protection on forms (captcha, honeypot, Akismet) | Very common | TS | all form plugins, Site Reviews | |
| GDPR/privacy tools (consent checkbox, data export/delete) | Common | TS | Newsletter, MonsterInsights EU tools, Hustle | Australian Privacy Act equivalent |
| Sending throttle / daily limits | Some | TS | Newsletter, Brevo free | Matters on Resend limits |

---

## Part 3: Observations for scoping

1. **What almost every WordPress marketing stack has (table stakes):** forms with consent and double opt-in; tags/lists and field-based segments; broadcast editor with templates; welcome sequence; unsubscribe and bounce handling; announcement bar/popup with page targeting and frequency caps; discount codes with expiry; share buttons + OG meta; meta/sitemap/schema/redirects; traffic and campaign stats. Directory plugins add paid plans, featured listings, expiry/renewal emails, reviews with owner replies, favourites, and saved-search alerts.
2. **EPA already covers much of the directory layer natively** (plans, featured slots, review queue, rider_alerts, analytics events, "your numbers" email, SEO digest, acquisition source). The gaps against a typical WP stack are mostly on the **email-marketing side**: a segment builder, a broadcast composer, trigger-based sequences with exit goals, a preference centre, suppression from Resend webhooks, and an announcement bar.
3. **Advanced features that plugins push hard but EPA likely doesn't need at its scale:** page-level A/B testing, heatmaps, lead scoring, multi-channel SMS/WhatsApp, visual workflow canvases, affiliate payouts/multi-tier commissions, gift cards/loyalty/BOGO, self-serve ad buying, send-time optimisation.
4. **Features that clash with EPA's hard rules:** pre-created claimable listings (GeoDirectory/Directorist claim model), paid ranking boosts (Voxel Promoted Posts) unless strictly labelled featured, "Verified" badges granted on claim (GeoDirectory) rather than on checks, and fabricated or inflated social-proof toasts.
5. **Cheapest high-value builds, judging by what plugins treat as core:** provider onboarding drip with exit-on-complete; renewal/expiry and failed-payment reminders; rider preference centre; review-request email after enquiry; segmented one-off announcements to providers (like Directorist Announcements); announcement bar with countdown for the founding offer; invite-a-colleague page with account-credit reward; UTM on all outbound links.

### Pricing caveats
- Most "per year" prices are introductory first-year prices; renewals are typically 1.5x to 2x.
- **EUR**: Rank Math, Blog2Social, Site Reviews Premium, Advanced Ads, AdRotate, Newsletter (old data).
- **Unverified**: Newsletter plugin current prices; Trustindex Pro price; TrustPulse price (third-party); Nelio prices (TrustRadius); MailPoet prices (third-party, stated as checked Sept 2026); Revive Social currency; WP Notification Bars Pro price; WP Job Manager individual add-on prices; Brevo tier dollar amounts.
- No AUD prices were displayed on any vendor page fetched.
