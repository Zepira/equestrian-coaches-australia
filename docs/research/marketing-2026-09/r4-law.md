# R4: Australian law the EPA marketing tools must support (research as at 25 Sept 2026)

> **This is research, not legal advice.** It pulls together primary sources (ACMA, OAIC, ACCC, state regulators, practitioner boards) plus law-firm commentary where primary pages could not be fetched. Some state and Spam Act legislation pages blocked automated fetching. Those points are marked "(secondary source)" or "(from knowledge, verify)". Get a lawyer to check the items in section 7 before launch.

---

## 0. Build list in one place (what the software must do)

| # | Requirement | Law | Priority |
|---|---|---|---|
| 1 | A **consent ledger** per contact and channel: address/number, consent type (express / inferred-relationship / inferred-conspicuous-publication), timestamp, source (form URL, invite link, import batch, admin user), **exact wording version** shown, IP/user agent, double-opt-in confirmation time, and withdrawal time and method. The ledger is append-only and never overwritten. | Spam Act s16 and Sch 2. The onus of proving consent sits with the sender (s16(5)) | Must |
| 2 | **Message classification** on every template: `transactional-factual` / `commercial`. A template is `commercial` if it has ANY promo content (an upsell line, "upgrade to Spotlight", a "see new providers" banner, social links with a "stay up to date" CTA). Commercial templates cannot be sent unless the consent check passes and they include an unsubscribe link and sender ID. | Spam Act s6. ACMA Lululemon (2026) and Ticketek cases | Must |
| 3 | **One-click unsubscribe** in every commercial email and SMS. No login, no password, no extra personal information required. Free to use. Processed straight away; the legal maximum is 5 working days. Works for at least 30 days after the send. Suppression is **global per channel** (it covers waitlist, rider digest, rider alerts, provider marketing and Kim's invites). | Spam Act s18, ACMA | Must |
| 4 | **Sender identification** in every message: "Equine Professionals Australia" plus ABN/legal entity name and a contact method that stays valid for at least 30 days after the send. | Spam Act s17 | Must |
| 5 | **SMS**: never rely on "reply STOP" to an alphanumeric sender ID, because people can't reply to one. Use a short link to a no-login unsubscribe page, or send from a number that can receive replies. Register the brand sender ID on the ACMA SMS Sender ID Register through the SMS provider. | ACMA common mistakes; SMS Sender ID Register (1 July 2026) | Must (if SMS used) |
| 6 | **No re-permission mail**: don't email people who have unsubscribed to ask them to come back. | ACMA | Must |
| 7 | **Kim's cold invites to providers**: allowed only under conspicuous-publication inferred consent (see 1.2). Log where the address was published (URL and capture date), check it isn't marked "no marketing", keep the message relevant to their trade, and include an unsubscribe link and sender ID. One follow-up at most is sensible. | Spam Act Sch 2 cl 4. Oneflare (2019) | Must |
| 8 | **Reviews**: publish every genuine review, including negative ones. Have a written, public moderation policy. Don't let paying status affect review display or order. Any incentive to leave a review must be (a) offered for positive and negative reviews alike and (b) disclosed on the review. No editing review text. Record who moderated what and why. Flag reviews that share an IP or email pattern. | ACL s18, s29(1)(bb) and (h). ACCC reviews guide | Must |
| 9 | **Paid placement labels**: "Featured" and "Sponsored" slots carry a clear, prominent label next to the card, not only in hover text or a footnote. Include a "How we rank" page that explains organic order and says paid tiers don't change organic ranking. A disclosure such as "EPA sells subscriptions to listed providers" appears near reviews and ratings. | ACL s18/s29. ACCC comparator and reviews guides | Must |
| 10 | **Prices**: show the total AUD price including GST as one figure (e.g. "$9.99/month incl. GST"). Put the renewal price and date next to any "free" or "founding" offer. No hidden fees. | ACL s48 (single price). Drip pricing rules from 1 July 2027 | Must |
| 11 | **Subscriptions** (provider plans; the rules also cover small-business customers): up-front key terms (price, renewal, how to cancel); reminder emails before the free-Spotlight period converts and before annual renewals; **cancel online in a few clicks** (Stripe customer portal); no dark patterns (fake timers, confirmshaming). | UTP Act, passed 2026, starts 1 July 2027. Current ACL s18/s29 already applies | Must by 07/2027; best practice now |
| 12 | **Privacy**: privacy policy and collection notices (sign-up, enquiry, alerts, waitlist, competitions) that name Resend, Supabase, Stripe and any pixels. Tell riders their enquiry details go to the provider. Keep a "where did you get my details" answer for every contact (the source field). From 10 Dec 2026, the privacy policy must list any automated decisions that significantly affect people. | APP 1, 5, 7 (if EPA is an APP entity, see 2.4), APP 1.7–1.9 | Should (Must if APP entity) |
| 13 | **Pixels and analytics**: prefer the existing server-side first-party events. If Meta or Google pixels are ever added, use a pixel-specific banner/notice, turn off automatic advanced matching and form-field capture, and never fire pixels on enquiry or health-related pages. Retargeting counts as direct marketing, so honour opt-out. | OAIC pixel guidance; Medmate and Monash IVF determinations (June 2026) | Should |
| 14 | **Competitions**: prefer **games of skill** (judged entries). No permit is needed for those. For a chance draw, cap total prizes at **$3,000 or less** to avoid permits in ACT, NSW and SA. Publish full T&Cs before entry. Log entries, the draw method, winner notification and prize delivery. Entry must be free (no fee to enter). | NSW Community Gaming; ACT GRC; SA CBS | Must (if competitions) |
| 15 | **Referral rewards**: show the reward terms in full. When a referrer benefits, say so in any shared message ("I get a free month if you join"). Don't disguise referral content as independent reviews. | ACL s18/s29 | Should |
| 16 | **Protected titles**: in provider onboarding, block or flag the words "physiotherapist/physio", "chiropractor" and "veterinary specialist/specialist" unless a registration number is supplied and checked. Record the registration number and check date. Don't show "verified" unless checked (already a hard rule). | Health Practitioner Regulation National Law ss113–119; state vet Acts | Must |

---

## 1. Spam Act 2003 and Spam Regulations 2021 (ACMA)

### 1.1 The three rules
Every **commercial electronic message** (email, SMS, MMS, IM) with an Australian link needs:
1. **Consent.** This is either *express* (the person knowingly agreed) or *inferred* (a) from an existing business relationship where the person gave their address, or (b) from conspicuous publication (see 1.2). "Under the Spam Act, it's up to you to prove that you have a person's consent." Keep records of who consented, when and how.
2. **Identify the sender.** Give an accurate business name and contact details that stay correct for 30 days after sending. If a third party sends on EPA's behalf, EPA's authorisation must be apparent.
3. **Unsubscribe.** The instructions must be clear. Requests are processed within 5 working days. It must be free, stay working for 30 days after the send, and need no account or log-in.

Source: ACMA, *Avoid sending spam*: https://www.acma.gov.au/avoid-sending-spam
ACMA, *Telemarketing and e-marketing – common issues and mistakes*: https://www.acma.gov.au/telemarketing-and-e-marketing-common-issues-and-mistakes. That page says unsubscribing must not need a log-in or personal information. SMS opt-out by replying to a Sender ID doesn't work. Auto-adding one-off purchasers or enquirers to marketing lists is risky. "Welcome journeys" are not exempt. Messages asking opted-out people to resubscribe may breach the Act. The business stays responsible when it outsources.

**Software requirements**
- `contact_consents` table: `contact_id, channel(email|sms), consent_type(express|inferred_relationship|inferred_published), purpose(rider_digest|rider_alerts|provider_marketing|waitlist|invite), wording_version_id, source (url/utm/ref/import_id/admin_id), captured_at, ip, user_agent, confirmed_at (double opt-in), withdrawn_at, withdrawal_method`. The table is append-only.
- Keep `consent_wording_versions`, storing the exact checkbox or label text shown.
- Sign-up checkboxes must be **unticked by default** and separate for each purpose. Signing up for an account or sending an enquiry does not by itself give marketing consent (per the ACMA "common mistakes" page).
- Add a global `suppression` table checked by *every* send path (Resend batch, one-off admin sends, invite tool).
- The unsubscribe endpoint uses a signed token. It unsubscribes with one click (a confirm page is fine, but no log-in), writes `withdrawn_at` at once, and sets the RFC 8058 `List-Unsubscribe` and `List-Unsubscribe-Post` headers.
- The footer on every commercial template holds the legal name, ABN, a contact email/postal address and the unsubscribe link.

### 1.2 Conspicuous publication (B2B outreach to providers)
Inferred consent from conspicuous publication needs **all** of these:
- the address is conspicuously published (for example, on the farrier's website contact page or a Facebook business page);
- it's reasonable to assume it was published with the account holder's agreement;
- the publication doesn't say "no unsolicited commercial messages";
- the message is **relevant to the recipient's work-related business, functions or duties**.
(Spam Act Sch 2 cl 4; secondary source: https://pointonpartners.com.au/spam-act/)

**Cautionary case (directory business): Oneflare, 2019, $75,600 plus an enforceable undertaking.** Oneflare took numbers from public directories and relied on conspicuous publication. ACMA found the ads "did not relate to the work-related business of the recipients", and the messages had no unsubscribe. ACMA: https://www.acma.gov.au/articles/2019-11/oneflare-pays-75600-infringement-notice-spamming ; summary: https://legalvision.com.au/oneflare-spam-act-lessons-for-business-owners/

**Software requirements for Kim's invites:** the invite form records `published_at_url`, `captured_on` and `relevance` (profession matches). It checks the suppression list, adds the unsubscribe link and sender ID, and rate-limits to one invite plus at most one follow-up. Scraped mass lists are out (this matches the existing "no scraped profiles" rule). Personal mobile numbers found on Facebook are risky: a personal page isn't clearly "work-related publication".

### 1.3 Transactional vs commercial, and "designated commercial electronic messages"
- **Commercial** (s6) means any message where *one* purpose is to offer, advertise or promote goods or services, including a third party's. ACMA (Jan–Mar 2026 report): "if an electronic message contains any promotional or sales content, it is commercial, regardless of whether the main content or purpose is factual." https://www.acma.gov.au/publications/2026-08/report/action-scams-spam-and-telemarketing-january-march-2026
- **Designated commercial electronic messages** (Sch 1) are messages with no more than factual information, plus limited extras (name, logo, contact details), and a few categories such as government, registered charities and educational institutions writing to their students. They are exempt from consent and unsubscribe but must still **identify the sender**. ACMA reads the exemption narrowly. In the Ticketek case, a "Stay up-to-date with the latest Ticketek events" banner plus social links made factual emails commercial. https://www.claytonutz.com/insights/2023/november/the-acma-cranks-up-enforcement-do-your-factual-customer-emails-pass-the-spam-act-test
- **Lululemon, March 2026: $702,900 plus a 2-year enforceable undertaking.** It sent more than 370,000 order and delivery "service" emails that contained promo content and had no unsubscribe. ACMA says it was the fifth action on this issue in 18 months, with more than $6.7m in penalties collected. https://www.acma.gov.au/articles/2026-03/lululemon-penalised-702k-spam-breaches

**Applying this to EPA (analysis, not settled law):**
| Message | Likely class | Build rule |
|---|---|---|
| Stripe receipt, password reset, enquiry-received notice to a provider (rider's enquiry forwarded) | Transactional / factual | No promo blocks allowed in the template. Enforce with a template linter. |
| Monthly **"your numbers"** email to paying providers: views, reveals, enquiries only | Probably factual (service info about a service they pay for) | If it contains **any** "upgrade to Spotlight", "try featured", "refer a friend" or promo, it becomes commercial. **Recommendation: treat it as commercial anyway.** Include unsubscribe and sender ID, and record consent at sign-up (inferred via the existing relationship, plus an express tick-box). That's cheaper than the risk. |
| **Rider alerts** (new providers or events in my area) | **Commercial.** It promotes third-party providers' services. | The rider's alert sign-up is express consent (store wording). Every alert carries unsubscribe (per-alert and global) and sender ID. |
| Rider monthly digest | Commercial | Express consent, unsubscribe, sender ID |
| Waitlist launch email | Commercial | Waitlist form wording must say they'll receive launch/marketing emails |
| Referral invite sent by EPA's system on a user's behalf ("Kim invited you") | Commercial, and EPA is the sender/authoriser | This is the biggest trap. The referrer's say-so is **not** the recipient's consent. Either let users share a link themselves (they send it from their own email/WhatsApp), or send system invites only under conspicuous publication with a full footer. |

### 1.4 Enforcement 2024–2026 (why this matters)
- 2026: **Lululemon** $702,900 (commercial content in service emails, no unsubscribe) (link above).
- 2025: **Tabcorp** $4m (SMS/WhatsApp without sender info, consent or unsubscribe); **Betfair** $871k; **Telstra** (March 2025, spam) https://www.acma.gov.au/articles/2025-03/telstra-penalised-spam-breaches
- 2024: **Commonwealth Bank** $7.5m (about 170m messages, consent and unsubscribe failures, including unsubscribe requiring log-in); **Pizza Hut** $2.5m (10m+ emails without consent or unsubscribe); **Luxottica** $1.5m; **Telstra** $626k (SMS without a functional unsubscribe); **PointsBet** $500k; **Outdoor Supacentre** $302k (80k SMS without consent).
- Compiled list (secondary): https://privacy108.com.au/insights/top-acma-penalties-2024-2025/ ; ACMA investigations index: https://www.acma.gov.au/investigations-spam-and-telemarketing
- ACMA consent Statement of Expectations (2024): consent must rest on clear T&Cs setting out the purpose, the sender, how long consent lasts, and how to withdraw. https://www.acma.gov.au/articles/2024-06/consent-expectations-businesses-using-direct-marketing
- Risk: infringement notices (typically six figures for a mid-size firm), enforceable undertakings with independent audits, and court penalties in the multi-millions per day for repeat corporate offenders. At EPA's size, the realistic risk is a complaint, an ACMA warning or infringement notice, and **reputational damage in a small, connected community**.

### 1.5 SMS specifics
- Same three rules apply. Unsubscribe instructions must work from a phone: a short link to a no-login page, or a reply-capable number. **"Reply STOP" to an alphanumeric sender ID doesn't work** (ACMA common mistakes page).
- **SMS Sender ID Register**: rules took effect **1 July 2026**. Branded (alphanumeric) sender IDs must be registered through the business's SMS provider or aggregator. Messages from unregistered IDs are **labelled "Unverified"** and grouped separately. They aren't blocked. There's no registration cut-off, but ACMA says to register now. https://www.acma.gov.au/sms-sender-id-register ; https://www.acma.gov.au/articles/2026-06/sms-sender-id-register-goes-live-help-protect-australians-scams
- **Build:** if SMS is added, use a provider that supports AU sender-ID registration, register "EquinePros" (or similar), and store the SMS consent separately from email consent.

---

## 2. Privacy Act 1988, including the 2024 amendments (OAIC)

### 2.1 Privacy and Other Legislation Amendment Act 2024 (tranche 1)
- **Penalty tiers** (from Dec 2024): *serious* interference up to the greater of $50m, 3x the benefit, or 30% of adjusted turnover; *mid-tier* up to $3.3m (body corporate); *administrative* breaches up to $330k. **Infringement notices** (for example, a deficient APP 1.4 privacy policy) up to $19,800 for unlisted companies, issued by the OAIC without going to court. https://jws.com.au/what-we-think/changes-to-australian-privacy-laws-now-in-force/
- **Statutory tort for serious invasions of privacy**: in force **10 June 2025**. It covers intrusion upon seclusion or misuse of information, where the conduct is serious and intentional or reckless and the public interest in privacy outweighs other interests. **It applies to everyone, including small businesses exempt from the APPs.** Remedies include damages, injunctions and apologies. https://www.oaic.gov.au/privacy/your-privacy-rights/more-privacy-rights/statutory-tort-for-serious-invasions-of-privacy
  - *EPA relevance:* publishing a provider's home address or a rider's details, or exposing enquiry contents. Build: show provider **service area, not home address**, by default. Keep enquiries private. Use RLS on every personal table.
- **Automated decision-making transparency (APP 1.7–1.9)**: starts **10 Dec 2026**. If a computer program makes, or substantially and directly contributes to, a decision that "could reasonably be expected to significantly affect the rights or interests" of an individual using their personal information, the privacy policy must list the kinds of information used and the kinds of decisions. https://www.gtlaw.com.au/insights/automated-decision-making-transparency-under-the-privacy-act
  - *EPA relevance:* organic ranking, auto-hiding or suspending a provider, fraud or fake-review auto-flags, and auto-rejecting a listing could all affect a sole-trader provider's livelihood. **Build:** a privacy policy section "Automated decisions" (ranking factors, auto-moderation) plus a human review path on request. Low cost; do it even if exempt.
- **Children's Online Privacy Code**: the OAIC must register it by **10 Dec 2026**. Phase 3 consultation on the exposure draft closed June 2026. It will bind APP entities providing social media, relevant electronic services or designated internet services "likely to be accessed by children". https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code
  - *EPA relevance:* junior riders and Pony Club members could plausibly use a coaching directory. **Build:** require account holders and competition entrants to be 18+ (or a parent/guardian account). No profiling or marketing to under-18s. Revisit when the final Code is published (Dec 2026).

### 2.2 APP 7 direct marketing
- Only applies to APP entities. **The Spam Act displaces APP 7 for email and SMS** (APP 7.8), so APP 7 mainly matters for **targeted ads, retargeting and custom audiences** (uploading hashed emails to Meta) and postal mail.
- Rules: a simple, free opt-out. Where the data wasn't collected directly or the person wouldn't expect it, there must be a prominent opt-out statement in each communication. Opt-out requests must be honoured within a reasonable time. On request, the organisation must **disclose the source** of the personal information. **Sensitive information needs consent.** https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-7-app-7-direct-marketing
- **Build:** the consent ledger `source` field answers "where did you get my details?". The global suppression list also excludes people from any ad-audience export.

### 2.3 Tracking pixels and cookies
- **There is no GDPR/ePrivacy-style cookie consent law in Australia.** However:
- OAIC guidance on *Tracking pixels and privacy obligations*: pixel data (form inputs, emails, IPs, URLs) can be personal information once platforms link it. APP 1 and 5 transparency is required. Minimise data collection, do due diligence on the vendor, don't "set and forget", and get express consent for any sensitive information. Retargeting counts as direct marketing (APP 7). https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/tracking-pixels-and-privacy-obligations
- **Determinations of 11 June 2026 (Medmate, Monash IVF)**: breaches through Meta/Google pixels. A generic cookie pop-up that didn't mention pixels was insufficient. A privacy policy alone isn't notification; an on-entry banner or notice is needed. The deploying business is responsible. The Commissioner used an "individuation" test: being able to single someone out counts as identifying them even without a name. https://www.allens.com.au/insights-news/insights/2026/07/tracking-pixels-targeted-advertising-and-compliance-lessons-from-recent-oaic-determinations/
- **EPA relevance:** EPA's plan uses **server-side first-party analytics**, which is the low-risk path. Keep it. If pixels are added later: show a pixel-specific notice, turn off automatic advanced matching and form capture, exclude `/enquire`, `/account` and any vet or health-related pages, and offer an opt-out toggle.

### 2.4 Small business exemption: does it cover EPA?
- Businesses with annual turnover of **$3m or less** are generally exempt from the APPs. **Exceptions**: health service providers; businesses that **trade in personal information** (collect or disclose it for a benefit, service or advantage); related bodies of a larger company; Commonwealth contractors; and others. A trading business is **still exempt if it acts with the individual's consent** (express or implied). Small businesses can also opt in voluntarily. https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business
- **Analysis (not settled):**
  - EPA is pre-revenue and well under $3m.
  - **Does a directory "trade in personal information"?** EPA publishes providers' details (sole traders' names and phone numbers are personal information), and providers pay for that. EPA also passes riders' enquiry details to providers, which is part of what providers pay for. So it arguably *does* disclose personal information for a benefit. The exemption survives **only if each individual consents**: providers consent by claiming and publishing their own profile, and riders consent to their enquiry going to the provider. This lines up with the existing hard rules (no pre-created scraped profiles, never sell rider data). **If EPA ever lists unconsenting providers, or shares rider data with anyone other than the provider the rider chose, it loses the exemption and is fully bound.**
  - The "health service provider" exception concerns health services to *individuals* (humans). Vets and equine bodyworkers serve animals, so it probably doesn't apply. Verify.
  - **Recommendation:** build to APP standard anyway (privacy policy, collection notices, access and correction, breach response, APP 11 security). The statutory tort and Spam Act apply regardless, the cost is low, and tranche 2 may still remove the exemption later.
- **Build:** log the consent for "publish my profile" (provider) and for "share my details with this provider" (rider enquiry), with wording versions.

### 2.5 Tranche 2 status (Sept 2026)
- The exposure draft *Privacy Amendment (Personal Data Protection) Bill 2026* was released for short consultation (submissions closed about 18 Sept 2026). The government plans to introduce it before the end of 2026. Proposals include:
  - a **"fair and reasonable" test** replacing parts of APPs 3, 4 and 6;
  - **consent to disclose personal information for money or for direct marketing**;
  - an **opt-out of personalised advertising**;
  - "best interests of the child".
- **Removing the small business exemption was left out** of the draft. https://www.ashurstperkinscoie.com/en/insights/australias-2026-privacy-reforms-a-first-look-at-pivotal-new-changes/
- **Design implication:** no trading in data, explicit consent records, and first-party analytics already fit where tranche 2 is heading. Don't build a "share rider data with sponsors" feature.

---

## 3. Australian Consumer Law (ACCC)

### 3.1 Reviews and testimonials
ACCC guidance for businesses and **review platforms** (EPA is a review platform):
- Fake reviews, or arranging them, are illegal. Businesses must not **suppress or edit negative reviews** or remove genuine negative ones.
- **Incentives** must be clearly disclosed and must apply **"regardless of whether the reviewer leaves a positive or negative review"**.
- Platforms must **clearly display their policy for publishing, editing and removing reviews**.
- Undisclosed commercial relationships that affect ratings or presentation are misleading. Suggested disclosure: "[Platform] sells advertising to [business]".
- Platforms should detect fake reviews both reactively and proactively (same IP or email, abnormal similarity) and give users an easy way to flag reviews.
- Sources: https://www.accc.gov.au/business/advertising-promoting-your-business/managing-online-reviews ; guide PDF: https://www.accc.gov.au/system/files/Online%20reviews%E2%80%94a%20guide%20for%20business%20and%20review%20platforms.pdf
- ACCC 2023 sweep: 37% of 137 businesses showed concerning review practices (fake reviews, review-management services, undisclosed incentives). https://www.accc.gov.au/media-release/scrutiny-of-influencers-and-businesses-for-misleading-advertising-and-online-reviews-continues
- **Build for EPA's review queue:**
  1. Only accept reviews linked to a real interaction (a logged enquiry or a confirmed lesson), and show a "Reviewed after enquiry via EPA" tag if that's accurate.
  2. Moderation removes only for published policy reasons (fake, offensive, defamatory, irrelevant, conflict of interest). **Never for being negative, and never at a provider's request alone.** Log `moderated_by, reason_code, at`.
  3. **Paid tier has no effect on review display, order or the average.**
  4. Providers can reply publicly but can't delete.
  5. Review-request emails sent by providers go to everyone (not only happy clients). Offer no incentive, or a disclosed incentive for any review.
  6. If a provider imports testimonials, label them "Provided by the business" and keep them separate from the verified review average.
  7. Show "Showing all N reviews", not a cherry-picked subset. Sorting defaults to newest.

### 3.2 Sponsored, featured and influencer disclosure
- ACCC comparator-website guidance: be transparent about commercial relationships, clearly separate sponsored results from organic ones, and explain what the ranking means. Commercially driven ordering presented as "best match" is misleading. (Summary: https://www.brightlaw.com.au/guide-for-comparator-website-operators-and-suppliers/ . The ACCC publication is *Comparator websites: a guide for comparator website operators and suppliers*.)
- ACCC 2023 influencer sweep: 81% of 118 influencers raised concerns. Common problems: vague tags ("sp", "spon"), hidden disclosures, and undisclosed brand relationships (link above). AANA Code of Ethics cl 2.7: advertising must be clearly distinguishable as such.
- **Build:**
  - The "Featured" card shows a visible **"Featured – paid placement"** or "Sponsored" label.
  - Featured slots sit **outside** the organic list (a separate row above it), not injected into it.
  - A "How ranking works" page, linked from search results.
  - Spotlight and Clinic tier perks must not include a hidden boost to organic rank. If a tier does affect order, it's disclosed on every result.
  - Any paid social or ambassador posts by Kim or providers use "Ad" or "Paid partnership".

### 3.3 Price display, promo codes, "free", referrals
- **Single price rule (ACL s48)**: show the total minimum price including GST as one prominent figure (it applies to B2B supplies as well). From knowledge; verify.
- **Founding offer** ("Spotlight free until 6 months after launch, then $9.99 locked"): the word "free" must not mislead. Show the conversion date and price at sign-up and in the plan page. Send a reminder before the first charge. Collecting card details up front with auto-conversion is exactly what the new subscription rules target.
- **Promo codes and discounts**: no fake "was" prices, no fake scarcity or countdown timers, and state all conditions (expiry, first term only). A code must work as advertised.
- **Referral rewards**: give the full terms (who qualifies, when the reward is credited, caps). Reviews or testimonials from people who received referral rewards must disclose that.

### 3.4 Unfair trading practices, subscription traps and drip pricing
- **Competition and Consumer Amendment (Unfair Trading Practices) Bill 2026**: passed Parliament (reported 1 July 2026). It **commences 1 July 2027**. It contains:
  1. a **general prohibition** on conduct that manipulates consumers or unreasonably distorts their decision-making (dark patterns, false urgency, hidden cancellation);
  2. **drip pricing**: mandatory transaction-based fees must be shown prominently alongside the headline price;
  3. **subscription contracts**: disclosure before sign-up; prescribed notifications at key stages (**end of trial or free period, renewals**); cancellation using only reasonably necessary steps, and **online cancellation for online subscriptions**. The subscription rules **also protect small-business customers** (fewer than 100 employees or under $10m turnover per commentary), so **EPA's provider subscriptions are in scope**. Penalties are at existing ACL levels (the greater of $50m, 3x the benefit, or 30% of turnover).
  - https://mk.com.au/unfair-trading-practices-reforms-passed-businesses-have-12-months-to-prepare/ ; https://www.russellkennedy.com.au/insights-events/insights/the-new-rules-for-online-sales-unfair-trading-subscription-renewals-and-hidden-fees ; Treasury: https://ministers.treasury.gov.au/ministers/andrew-leigh-2025/media-releases/unfair-trading-tricks-and-traps-be-banned
  - Prescribed notice content and timing will come in regulations. Check when they are published.
- **Build now (it's cheap with Stripe):**
  - a pre-checkout summary (price incl. GST, billing period, renewal, conversion date, how to cancel);
  - emails sent automatically **before the free Spotlight period ends** (for example 14 and 3 days before) and **before annual renewal**, with a stored send log;
  - self-serve cancel through the Stripe Customer Portal, with no "call us";
  - no confirmshaming or fake timers.

---

## 4. Trade promotions and competitions

- **Game of skill** (winner chosen on merit by judging, e.g. "best photo of your horse with your coach", judged against published criteria): not a lottery, so **no permit** in any state. SA: "if the winners are determined by skill, it isn't considered a lottery". A token skill element followed by a random draw is still a lottery. https://www.sa.gov.au/topics/business-and-trade/running-a-business/trade-promotions
- **Game of chance (random draw)** permits:
  - **NSW**: an authority is required only if the **total prize value exceeds $10,000**. Entry must be free (buying at normal retail price is allowed). Rules must be clearly advertised, or their location stated. Onerous conditions must be displayed. Some prizes are banned (firearms, tobacco and vapes, cosmetic surgery, excess alcohol). https://www.nsw.gov.au/money-and-taxes/community-gaming/trade-promotions (NSW permits were largely removed in 2019. The current official page states the $10k authority threshold. Verify before any draw above $10k.)
  - **SA**: a licence is needed for a "major" promotion with **total prizes of $5,001 or more** decided by draw, and always for instant scratch-style promotions. Entry must be free. Maximum duration 12 months. (Link above.)
  - **ACT**: a permit is needed unless the **total prize value is $3,000 or less**; exempt lotteries still have conditions. https://www.gamblingandracing.act.gov.au/industry/lotteries/trade-promotions
  - VIC, QLD, WA, TAS, NT: no permit, but conditions and ACL still apply (secondary: https://www.roopon.com/blog/australian-trade-promotion-permits-2026).
- **T&Cs must include**: promoter name and ABN; eligibility (age 18+ or parental consent, residency, exclusions for EPA staff and families); entry period and how to enter; entry limits; judging criteria or draw method and date/place; prize description and value; how and when winners are notified and published; claim period and redraw rules; privacy use of entrant data (**entering does not by itself give marketing consent** unless there's a separate tick-box).
- **Build:** a competition module with required T&C fields; a separate, optional marketing consent tick-box; entry logging (timestamp, IP, duplicate detection); a judging record or auditable random draw; winner publication; and a guard that warns when total prize value exceeds $3,000.

---

## 5. Health-adjacent providers (vets, physios, chiros, etc.)

- **AHPRA and the National Law don't regulate practice on animals.** The Chiropractic Board says: "The National Law does not extend to practice on animals, only on human patient care". The section 133 advertising rules (including the testimonial ban) apply only to human health services. https://www.chiropracticboard.gov.au/Codes-guidelines/FAQ/Animal-chiropractic.aspx
- **Protected titles still apply.** "Animal physiotherapist" or "equine physio" used by someone **not** registered as a physiotherapist "may amount to a breach of the title protections under sections 113-119 of the National Law". The same goes for "chiropractor". Registered practitioners using these terms should make clear the Board doesn't regulate their animal practice. https://www.physiotherapyboard.gov.au/Codes-Guidelines/FAQ/Animal-practice.aspx
  - **EPA risk:** EPA's category names "physios" and "chiropractors" could lead unregistered equine bodyworkers to use protected titles on EPA. **Build:** name the categories "Equine physiotherapy & rehab" and "Equine chiropractic & manual therapy". In provider profiles, allow the titles "Physiotherapist" or "Chiropractor" only with an AHPRA registration number that has been checked against the public register. Offer neutral titles otherwise ("equine bodyworker", "equine therapist"). Add a disclaimer on those categories: "AHPRA does not regulate treatment of animals".
- **Vets** are regulated by state and territory boards under state Acts. Example, Victoria (*Veterinary Practice Act 1997* s59, Board Guideline 04): advertising must not be false, misleading or deceptive, and must not unfavourably contrast one vet's services with another's. Offers must state their terms. **Testimonials are permitted** but must meet the same standards. https://www.vetboard.vic.gov.au/VPRBV/VPRBV/VPRBV_Guidelines/Guideline_04_-_Communication.aspx
  - **"Specialist"** is restricted to vets registered as specialists (e.g. Vic Guideline 17). "Equine specialist" on a general vet's profile is a risk. https://www.vetboard.vic.gov.au/VPRBV/VPRBV/VPRBV_Guidelines/Guideline_17_-_Emergency_veterinary_services_and_specialist_veterinary_services.aspx
  - No Australian vet board found in this research bans testimonials outright. The ACL applies to vet reviews as usual.
  - **Only registered vets may perform acts of veterinary science**, and in several states that includes equine dentistry procedures and some therapies. Directory copy shouldn't imply that non-vets diagnose or treat disease.
  - **Build:** a vet-profile field for state registration number(s) and a check date. Don't allow the words "specialist" or "specialised" in vet titles unless a specialist registration is recorded. Keep review and featured rules the same as for other professions. Don't put "comparisons" such as "better than X clinic" in EPA marketing.

---

## 6. Risk summary if ignored

| Area | Realistic risk for EPA |
|---|---|
| Spam (no consent record, broken unsubscribe, promo in "service" email) | ACMA complaint, then warning or infringement notice (ACMA fined Oneflare, a directory, $75k). Community reputation damage. Resend or domain deliverability suspension. |
| Reviews and paid ranking | ACCC action or competitor complaints under s18/s29; loss of the trust that is the product. Penalties reach $50m or 30% of turnover (the court sets actual amounts). |
| Subscriptions and "free" founding offer | Current ACL misleading-conduct risk; from 1 July 2027, specific subscription contraventions. Chargebacks. |
| Privacy | The statutory tort applies now, whatever the business size. Losing the small business exemption would bring OAIC infringement notices (up to $19,800 each) and civil penalties. |
| Competitions | An unlicensed lottery offence in SA/ACT/NSW above the thresholds; void promotion. |
| Protected titles | A provider commits a National Law title offence; EPA could be seen as facilitating it; reputational harm with vets and physios. |

## 7. Open items for a lawyer (before launch)
1. Is the monthly "your numbers" email a designated or factual message if it has zero promo content? (The recommendation already treats it as commercial.)
2. Does the directory business model count as "trading in personal information", and are the consent flows enough to keep the small business exemption?
3. Wording for the founding-offer conversion and the pre-renewal notice, once the UTP regulations are published.
4. NSW trade-promotion authority threshold: confirm the current position.
5. Whether the Children's Online Privacy Code (final, Dec 2026) could reach an equestrian directory with junior riders.
6. State-by-state vet advertising rules outside Victoria (NSW Veterinary Practice Regulation, Qld Veterinary Surgeons Act); not fully checked here.
