# Hand test plan

Every feature built from 12 October 2026 on, with how to test it by hand. Updated as each feature lands, so it's always the list of what's waiting to be checked. Tick a box when it passes; when something fails, note what you saw next to it and we'll fix it in the refine pass.

Kim's plain-language version is the handbook page "What's been built" (`content/handbook/whats-built.html`, at `/admin/handbook/whats-built`).

## Before you start

- **Where:** `npm run dev`, then http://localhost:3000. Most of this also works on the test site once it's pushed; the notes say where it doesn't.
- **Accounts** (passwords in `.env`, never in the repo):
  - Test coach: `TEST_PROVIDER_EMAIL` / `TEST_PROVIDER_PASSWORD`. Bendigo, Spotlight plan, unpublished.
  - Test rider: `TEST_RIDER_EMAIL` / `TEST_RIDER_PASSWORD`.
  - Admin: your own account.
  - Fresh start: `node scripts/smoke/test-accounts.mjs reset` deletes both and makes them again (testimonials, photos and video go with them).
- **Unpublished profiles** 404 for everyone. To see the test coach's profile, add `?preview=1`: http://localhost:3000/profile/tess-coachman?preview=1
- **Content changes** (admin words, settings) take up to a minute to show; reload after that.
- **Phones:** check anything visual at phone width too (browser dev tools, 375px wide).

---

## 1. Header and navigation

Built 12 Oct 2026.

- [ ] **Sub-menu bar.** Hover "Horse care" or "Coaches" on desktop. The bar drops below the header in a slightly deeper tan with a thin line between them. With the menu closed, there's no line under the header.
- [ ] **Solid header while open.** Scroll down any page so the header goes see-through, then open a menu. The header turns fully solid (no page showing through). On `/search` the header stays dark green.
- [ ] **No hairline over photos.** On `/`, `/coaches`, `/horse-care`, `/for-coaches`, `/for-professionals`, look closely along the bottom of the see-through header over the photo. No dark line.
- [ ] **"Search all" is bold** as the first item in each sub-menu (desktop and the phone menu).
- [ ] **Page progress bar.** Click between dashboard tabs, or any link to a slow page. A thin terracotta bar runs along the very top while the next page loads, then fills and fades. Opening a link in a new tab (ctrl/cmd-click) doesn't start it.

## 2. The pitch pages

Built 12 Oct 2026.

- [ ] **`/for-professionals`** has everything `/for-coaches` has: photo hero, ticker, "Be the one they call" with the profession tiles, the founding offer beside the example monthly email, "What we actually do", plans with the full comparison, "We never take a percentage of a job", questions.
- [ ] It's in **steel blue**, not terracotta, and the founding panel has the horse photo behind it.
- [ ] **Words fit horse care:** "horse owners", "a job", "specialities", plan taglines "For most professionals" etc. Nothing says "coach" where it shouldn't.
- [ ] **No profession picked:** every "Join"/"Choose" button scrolls to the profession tiles.
- [ ] **`/for-professionals?p=farriers`:** the hero says "For farriers", the founding panel "Founding farriers", and every button goes straight to farrier sign-up with the plan in the address.
- [ ] **`/for-coaches`** still reads as before (dashes gone, "find me on Equine Professionals" instead of "EPA").
- [ ] **Billing line** under the plans on both pages: "Charged in advance... Refunds", and the Refunds link works.
- [ ] Both pages at phone width: nothing runs off the side.

## 3. Footer

Built 12 Oct 2026.

- [ ] Bottom of every page: "© 2026 Equine Professionals Australia" left, policy links right (Terms, Privacy, Cookies, Refunds, Review policy), all working.
- [ ] Second row, smaller: "ABN 74 931 177 211 · Buln Buln, Victoria" left, "Site by Daiquiri Creative" right, underlined, opening daiquiricreative.com.au in a new tab.
- [ ] **Admin:** Admin → Pages → Footer has the tagline, town, credit and credit link. Change the credit words, wait a minute, reload: the footer follows. Put it back.
- [ ] Phone width: everything stacks left-aligned.

## 4. Legal pages

Built 12 Oct 2026 from the "Legal pages" draft 2.

- [ ] **`/terms`, `/privacy`, `/cookies`, `/refunds`** all load, with the draft notice at the top while legal approval is off.
- [ ] **Filled in from settings, no `{curly}` left anywhere:** ABN (74 931 177 211), contact email, founding price ($9.99), "six months", enquiry retention months, pause months (3).
- [ ] **Links inside the text work:** /refunds, /privacy, /cookies, /review-policy, /how-we-list, oaic.gov.au.
- [ ] **Refunds** shows a five-item bullet list under "Refunds".
- [ ] **Cookies** has the "Videos on profiles" section.
- [ ] **`/review-policy`** has the two new sections at the end, and the contact email is filled in.
- [ ] **Competition terms** (any competition page) have the new "Your details" and "The fine print"; "/privacy" is a link.
- [ ] **Search engines:** view source on a legal page; it has `noindex` while legal approval is off. Switch it on in Admin → Settings: the draft notice goes and the page becomes indexable. Switch it back off.
- [ ] **Admin → Pages** lists Terms, Privacy, Cookies, Cancelling and refunds, and "Privacy lines on forms". Edit a sentence, check it shows, put it back.
- [ ] **Before launch (test with the `gate-prelaunch` preview, or on the real domain after a push):** `/terms`, `/privacy`, `/cookies`, `/refunds` and `/review-policy` open on the public domain without the password. The coming soon page shows the business line and links to Terms, Privacy and Refunds.

## 5. Privacy lines on forms

Built 12 Oct 2026. Each should show its line, with working links.

- [ ] **Enquiry form** on any profile (desktop panel and the phone pop-up): "Your name, contact details, suburb and message go to [first name]..." with the name filled in.
- [ ] **Rider sign-up** (`/signup`): "By creating an account you agree to our terms. We keep your name and email..."
- [ ] **Professional sign-up** (`/signup?profession=coaches`): the longer line with Privacy policy and Cancelling and refunds links.
- [ ] **Review form** (`/review/<a published slug>`): "We publish your first name, surname initial..."
- [ ] **Competition entry:** "...delete them 12 months after the result. Competition terms" and that link jumps to the terms lower on the page.
- [ ] **Guide download form** (a guide with a file): "We'll email you the link now."
- [ ] **Onboarding plan step** and the founding card panel: the billing line.
- [ ] **"Use my location"** crosshair: hover it; the tooltip says it's used once and not stored.

## 6. Consent wording and marketing email footers

Built 12 Oct 2026.

- [ ] **New tick-box words** (Admin → Audience shows version 2 of each):
  - professional sign-up box: "Send me my monthly numbers and news for professionals."
  - alert sign-up (account page alert form, subscribe card): "Email me when something I follow changes (a new coach near me, a clinic). Unsubscribe any time."
  - competition box: "Send me the monthly round-up of events and new people near me."
- [ ] **Marketing email footer:** from Admin → Emails, send yourself a test of a commercial email (the monthly numbers or a round-up). The footer has "Equine Professionals Australia, ABN 74 931 177 211, Buln Buln, Victoria", the contact email, and the "choose what we send you" link. If your test address has given that consent, it also says "You're getting this because you asked for ... on [date]".

## 7. Uploads

Built 12 Oct 2026. Files now go straight from the browser to storage, so size limits on Vercel no longer apply.

- [ ] **Profile photo** (test coach, Dashboard → Profile → Add a photo): pick a big phone photo (several MB). It uploads and appears. Try an iPhone HEIC photo if you have one.
- [ ] **Admin image pickers:** upload a photo on a discipline (Admin → Disciplines → one), a profession (Admin → Professions → one), a competition, a guide's top photo and a sponsor slot. Each shows the new photo; replacing one swaps it.
- [ ] **Guide PDF** (Admin → Guides → one → Upload a PDF): uploads.
- [ ] **Too big or wrong type:** try a file over 25MB, or a non-image in a photo picker. It's refused with a message, not a hang.
- [ ] **Test site after a push:** repeat the profile photo there. This is the case that used to fail (Vercel's 4.5MB limit).

## 8. Intro videos (YouTube or Vimeo links)

Built 12 Oct 2026. The test coach is on Spotlight, which includes video.

- [ ] **Dashboard → Profile → Intro video:** a link box, not a file picker.
- [ ] **A non-video link** (e.g. https://example.com/x) is refused: "Paste the link to a YouTube or Vimeo video..."
- [ ] **Each of these saves:** a youtu.be link, a youtube.com/watch link, a YouTube Shorts link, a vimeo.com link, an unlisted Vimeo link (vimeo.com/123456/abcdef).
- [ ] **Preview:** a still (YouTube) or dark panel (Vimeo) with a play button and "Plays from YouTube/Vimeo". Press play: the video plays in place.
- [ ] **Profile preview** shows the same player.
- [ ] **Nothing loads early:** with the browser's network tab open, load the profile. Nothing from youtube.com or vimeo.com until you press play (YouTube's still image from i.ytimg.com is the one exception).
- [ ] **Listed plan:** switch the test coach to Listed (Dashboard → Billing). The video box is replaced by "Video is available on..." and saving a link is refused.
- [ ] **Remove video** clears it.

## 9. Loading states ("nothing happening")

Built 12 Oct 2026.

- [ ] **Log in:** the button shows a spinner and "Logging in…" and keeps it right up until the dashboard appears. It doesn't flick back to "Log in" in between.
- [ ] **Wrong password:** the spinner stops and the error shows.
- [ ] **Sign up, forgot password, set new password:** spinner while working; after a successful new password it keeps spinning until the next page.
- [ ] **Save buttons** (profile save, billing buttons, admin saves, account page): a spinner appears while saving and goes when done.
- [ ] **Upload buttons** spin while uploading.
- [ ] **Reduced motion** (turn on "reduce motion" in your OS): spinners pulse gently instead of spinning.

## 10. Testimonials

Built 12 Oct 2026. Log in as the test coach.

Every plan:
- [ ] **Dashboard → Testimonials** tab exists (after Reviews). The intro explains testimonials vs reviews.
- [ ] **Add one yourself:** quote, name, town. It appears under "On your profile" and the form clears.
- [ ] **Edit** one you added: the change shows.
- [ ] **Order:** ↑ and ↓ move them; the top one's ↑ and the bottom one's ↓ are greyed.
- [ ] **Hide:** it moves to "Hidden". **Show on my profile** brings it back to the end of the list.
- [ ] **Delete** asks first, then removes it.
- [ ] **Too long:** a quote over 800 characters is refused.
- [ ] **Profile preview** (`?preview=1`): testimonials in your order, "Name, Town" under each, labelled "Provided by the business", and they don't change the star rating.
- [ ] **Dashboard → Profile** shows a small Testimonials card with the count and "Manage testimonials".
- [ ] **Profile checklist** on the overview: "Three testimonials" ticks once three are showing, and its Add link goes to the Testimonials tab.
- [ ] **Overview nudge:** with at least one enquiry and fewer than three testimonials, "Ask for a testimonial" shows under Latest enquiries.

Spotlight and Clinic (the test coach is Spotlight):
- [ ] **Ask for a testimonial** card shows a copyable link (`/testimonial/tess-coachman`).
- [ ] **As a client:** open that link in a private window. The page explains it goes to Tess first. Without the consent tick it won't send. With it: "Thanks. It's with Tess now..."
- [ ] **Email to the professional:** "Priya wrote you a testimonial" (check the test coach inbox at resend.dev, or the server log when email isn't connected).
- [ ] **Waiting:** back in the dashboard it's under "Waiting for you" with Show, Keep it hidden and Delete, and **no Edit** (a client's words can't be changed).
- [ ] **Show it**, then **Pin to the top:** it moves first, marked "Pinned to the top", and is first on the profile preview. Pinning another moves the pin.
- [ ] **Spam limits:** more than five sends from one device in a day are refused; the hidden "website" trap field stops bots.
- [ ] **Downgrade to Listed:** the link card turns into "Spotlight and Clinic include a link..."; the request page says Tess isn't collecting through this link; pinned testimonials stop being pinned on the profile (the pin comes back if you upgrade). Nothing is deleted.
- [ ] **Admin → Plans:** a "Testimonial tools" tick per plan. Untick it on Spotlight and the test coach loses the link and pin; tick it again.
- [ ] **Admin words:** Admin → Pages → "Testimonial request page" and Admin → Emails → "Testimonial waiting" edit the client page and the email.

## 11. Test accounts

Built 12 Oct 2026.

- [ ] `node scripts/smoke/test-accounts.mjs create` says "already exists" for both and changes nothing.
- [ ] `reset` deletes and remakes them with new passwords in `.env`; logging in with the new password works.
- [ ] Neither shows up in public search or listings (the coach is unpublished).

## 12. Extra locations (Clinic)

Built 12 Oct 2026. A professional who works from two or three places can add up to two more bases, each with its own travel distance. The test coach is on Spotlight (one base); move it to Clinic for these (Dashboard → Billing, or ask Claude to switch it in the database). The test coach already has Ballarat saved, dormant on Spotlight.

- [ ] **Spotlight or Listed:** Dashboard → Profile → "Other locations" explains the feature and says which plan includes it, with a Change plan link. No add form.
- [ ] **Clinic:** the card says "Your plan covers 3 places in all, including Bendigo VIC" and has an add form.
- [ ] **Add one:** type a town, pick it from the list, set a travel distance, Add location. It shows by its real name in normal capitals (e.g. "Ballarat VIC", not a neighbouring suburb or "BALLARAT").
- [ ] **Cap:** after two extras the add form disappears. Remove one and it comes back.
- [ ] **Profile:** the location line says "Based in Bendigo VIC · travels up to … · also works from Ballarat VIC".
- [ ] **Search** (needs a published profile; on the test coach, publish it from Admin → Providers first, and unpublish after): search near the extra town. The professional appears, the card shows the extra town and its distance, and the map pin sits on the extra town. Search near the main base: the card shows the main base.
- [ ] **Area pages:** after the nightly recompute (or ask Claude to run it), the extra town's area page counts the professional toward its three.
- [ ] **Downgrade to Spotlight:** the extra location shows "Not showing on your current plan", the profile drops "also works from", and search near the extra town no longer finds them. Nothing is deleted; back on Clinic it all returns.
- [ ] **Admin → Plans:** each plan has a "Locations" number (1 to 3). Set Spotlight to 2: Spotlight professionals can add one extra. Put it back to 1.

## 13. Error pages and error alerts (Sentry)

Built 12 Oct 2026. Sentry only switches on once `NEXT_PUBLIC_SENTRY_DSN` is set (Vercel, and `.env` to try it locally); until then error pages still show, nothing is reported.

Setting it up (Alana, once):
- [ ] Create a free Sentry account and a Next.js project. Copy its DSN.
- [ ] In Vercel → Settings → Environment Variables: `NEXT_PUBLIC_SENTRY_DSN` (the DSN), and for readable stack traces `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` (an auth token from Sentry with project:releases scope). Redeploy.
- [ ] Sign up as yourself, ideally with the business inbox (hello@equineprofessionals.com.au), and name the organisation "Equine Professionals Australia". Sentry's free plan allows one user (check when signing up), so using the shared inbox is how the alerts reach you both.
- [ ] In Sentry → Alerts: check the default "new issue" alert emails that user. That email is the alert.

The pages:
- [ ] **A broken page** shows "This page didn't load." inside the normal header and footer, with Try again, Go to the home page, the contact email and a reference number. (Ask Claude for a temporary broken page to look at it; one existed briefly at `/zz-error-test` and was removed.)
- [ ] **In the dashboard** a broken tab says "That part of your dashboard didn't load." and keeps the dashboard menu, with "Back to the overview".
- [ ] **In admin** a broken screen keeps the admin rail.
- [ ] **Try again** reloads the part that broke.
- [ ] **Phone width:** everything readable, buttons stack nicely.

The alerts (after the setup above, on the test site):
- [ ] Break something on purpose (Claude can add a temporary test page) and open it. Within a minute or two the error is in Sentry, with the page address and the reference number shown on the error page, and the alert email arrives.
- [ ] The report has no email addresses, IP address or cookies in it.
- [ ] An error in the browser (not just the server) also arrives; reports go through `/monitoring` on our own site, so an ad blocker doesn't stop them.
- [ ] The Sentry environment says "preview" or "production", so test-site errors can be told apart.

Privacy:
- [ ] `/privacy` → "Who helps us run the site" mentions Sentry and what an error report contains.

## 14. The coaches-only stage

Built 12 Oct 2026. A middle step between the coming soon page and full launch: professionals can join, set up and pay on the real domain while riders still see coming soon. Set on Vercel with `SITE_STAGE=coaches` (see `docs/launch.md`, "The three stages").

Automated check first (no browser needed): `npm run build`, start the `gate-coaches` preview (port 3130), then `node scripts/launch/host-gate.mjs --mode coaches --base http://localhost:3130`. All checks should pass. Also run `--mode prelaunch` against the `gate-prelaunch` preview (port 3120) to confirm the old stage is unchanged.

By hand, once `SITE_STAGE=coaches` is set on the real deployment:
- [ ] **The domain's home page** is still the coming soon page, now with a dark "Coaches and horse care professionals… List your business" box under the waitlist form.
- [ ] **That button** goes to `/list-your-business`, which opens normally, with a header showing only For coaches, For professionals, About, Log in and List your business (no Horse care or Coaches menus), and a footer without the "Find" column.
- [ ] **Joining works end to end on the real domain:** `/join/coaches` → sign up → confirmation email → onboarding → dashboard. (With real Stripe keys, billing too; without them, billing says "Billing isn't switched on yet" rather than giving a free plan.)
- [ ] **A published profile** opens at `/profile/<slug>` on the domain.
- [ ] **Rider pages stay closed:** `/coaches`, `/search`, `/horse-care`, `/farriers`, an event, `/account` and `/admin` all show the coming soon page.
- [ ] **Nothing new in Google:** in the browser's dev tools, Network tab, `/for-coaches` comes back with `X-Robots-Tag: noindex`. `robots.txt` still allows only `/`.
- [ ] **Test site** is unchanged: the whole site behind the password.
- [ ] **Admin → Pages → Coming soon** has "Join now (coaches stage only)" to edit the box's words.

## 15. Safety lock on the database wipe

Built 13 Oct 2026. `scripts/db/rebuild.mjs` (which drops every table) now refuses, with no override, once a real professional is in the database: a Stripe customer that isn't a mock one, or a published profile whose accounts aren't admins or test addresses (@resend.dev, @example.com).

- [ ] `node scripts/db/rebuild.mjs --check` on today's database says the wipe would be allowed, and changes nothing.
- [ ] With a fake real customer on the test coach (ask Claude, or set `subscriptions.stripe_customer_id` to `cus_TEST…` by hand), `--check` refuses and names the profile. Put it back to `mock_epa_test_coach` after.
- [ ] Running it with no flag refuses to start.
- [ ] After the first real coach joins, `--check` refuses on its own.

## 16. The database in Sydney

Done 13 Oct 2026. The whole database (logins, every table, photos) was copied from the Tokyo project to a new one in Sydney. Local development already uses Sydney; the test site switches when the Vercel keys change.

After the Vercel keys and the Auth settings are switched (see the steps in the build plan):
- [ ] **Log in** on the test site as yourself, the test coach and the test rider, with your existing passwords.
- [ ] **Your edits survived:** the footer credit, the legal pages, a discipline's words, Admin → Settings all show what they did before.
- [ ] **Photos** on Alana's and the test coach's profiles load.
- [ ] **Sign up** a new account on the test site: the confirmation email arrives (needs the SMTP setting) and its link works (needs the Redirect URLs).
- [ ] **Password reset** email arrives and its link works.
- [ ] **Save something** (a profile edit, an admin setting) and reload: it stuck.
- [ ] **Search and area pages** still list the right people (sample listings, and the test coach once published).
- [ ] **A week later,** with nothing missing: pause the Tokyo project, then delete it, and remove the `TOKYO_*` lines from `.env`.

## 17. The test site without a password

Built 13 Oct 2026. Works once `TEST_HOST_OPEN=true` is added in Vercel (Production) and the site redeploys.
- [ ] Open https://test.equineprofessionals.com.au in a private window: the site loads with no password box.
- [ ] Google still can't list it: https://test.equineprofessionals.com.au/robots.txt says `Disallow: /`.
- [ ] https://equineprofessionals.com.au still shows the coming soon page.
- [ ] As the test coach on the test site, try changing plan in Dashboard, Billing: it says billing isn't switched on yet (no free plans while the site is open). Plan changes still work on localhost.
- [ ] Taking the password back: remove `TEST_HOST_OPEN` (or set it to anything but `true`), redeploy, and the password box returns.

## 18. Phones (mobile pass)

Done 13 Oct 2026. Every page was measured at four phone and tablet widths, and the problems fixed. Worth a look on your own phone:
- [ ] **Typing doesn't zoom:** on an iPhone, tap the suburb box on the home page, the log in fields, and a field in Dashboard, Profile. The page shouldn't zoom in.
- [ ] **Profile:** on a coach's profile the orange "Enquire with …" bar is one line ("Free" on the right; on a wider phone, "Free · no account needed").
- [ ] **Search with no results:** search somewhere empty (Vaulting near Broome WA). No floating "Map" button over the email form. A search with results still has it.
- [ ] **Dashboard on a small phone:** the header shows the logo and your initial with nothing cut off; "View my public profile" is in the initial's menu. From about 420px wide the "View profile" button shows too.
- [ ] **Cancel page** (Dashboard, Billing, cancel) on a small phone: the three option cards fit the screen.
- [ ] **Footer links** (Terms, Privacy...) and "Log in" are easy to tap with a thumb.
- [ ] **Home page** says "1 coach", not "1 coaches", while there's only one.

## 19. iPhone status bar over the photos

Built 13 Oct 2026. Only testable on a real iPhone, after the push deploys.
- [ ] Open the home page on your iPhone (fresh tab, or reload): the strip behind the clock and battery is dark like the top of the photo, not grey.
- [ ] Same on /coaches, /horse-care, /for-coaches and /for-professionals (horse care is a slightly lighter dark).
- [ ] Scroll down until the header turns cream, then reload partway down: the status bar is light, not dark over a light header.
- [ ] Look closely at the very top edge of the photo: no visible band.
- [ ] **The photo behind the clock (runway, added later the same day):** open the home page fresh on your iPhone. The photo itself should carry on behind the clock and battery, not a flat dark colour. The page looks the same as before; it has quietly opened scrolled down a little.
- [ ] Pull the page down to the very top: a little more photo appears above, and the status bar turns flat dark (Safari's rule at the very top). Scroll back and the photo returns behind the clock.
- [ ] **No line under the status bar, and no gap after scrolling back up (13 Oct, later):** on the home page, /coaches and /horse-care, the photo behind the clock is shaded the same as just below it, with no line where the status bar ends. Scroll down, then back up to the top and let go: the page glides back to where it opened, photo behind the clock, no flat dark band. Tap the status bar to jump to the top: same result.
- [ ] Scroll down until the header turns cream: header and status bar are now the same solid cream, no seam.
- [ ] Go to About, then tap the logo back to home: it opens the same way (photo behind the clock).

## 20. Nobody named on the site (tone audit)

Done 13 Oct 2026 (docs/tone-audit.md). The database rows are already updated; give the test site a minute after the deploy.
- [ ] **About** (/about): five parts only: the opening, "Why it exists" (no names), "How we do things", "Who runs it, for the record" (an independent partnership, one person behind it coaches and is listed like any other) beside "We're new", then "Built by riders. Riders and professionals are what make it work." No bios, no photos.
- [ ] **Admin, Pages, About:** the editor lists those five blocks, no "The rider" or "The coach".
- [ ] **/for-coaches:** the "what we do" table says "We answer the recommendation posts in equestrian Facebook groups", no name.
- [ ] **/for-coaches and /for-professionals:** the "tell us what to fix" box ends "a person who runs the site reads it, not a ticket queue. Founding members get a reply within two business days."
- [ ] **Coach dashboard** (test coach, on a wide screen): under the plan card, "Something not working? Email us. A person who runs the site reads it."
- [ ] **Terms** "Who we are" and **Privacy** "Who this covers": the business name and ABN, no partners' names.
- [ ] **Footer:** "Site by Daiquiri Creative" still there and still links.

## 21. Emails in dark mode

Built 14 Oct 2026. Needs the three auth templates in docs/auth-email-templates.md pasted into Supabase again (Authentication, Email Templates: Confirm signup, Reset password, Password changed). The other emails pick it up on the push.
- [ ] Turn on dark mode on your phone. Sign up on the test site with a new address and open the confirmation email in the Outlook app: deep green background, a slightly lighter green header bar, cream heading and text, terracotta button. No grey.
- [ ] Open the same email in Apple Mail (dark mode on): the same deep green version.
- [ ] Turn dark mode off and open it again: the cream version, as before.
- [ ] Forgot password on the log in page, with dark mode on: the reset email is the green version too, and its button still works.
- [ ] Send yourself an enquiry or a waitlist confirmation with dark mode on: the same green version, links in peach.
- [ ] Gmail decides its own dark colours, so it may still look different there. It should still be readable.

## 22. Suburb fields that only take a real suburb

Built 14 Oct 2026. Every box where someone saves a place now works like an address box on a shop checkout: type, pick from the list, and it fills in as "Bendigo VIC 3550" with a tick. Until a suburb is picked the form won't save and says "Pick your suburb from the list." Searches stay forgiving.
- [ ] **Onboarding** (new test coach, "Where do you work?"): type "Bend", pick Bendigo. The box shows "Bendigo VIC 3550" with a tick and the line under Continue says "Based in Bendigo VIC 3550".
- [ ] Same step: type "Richmond" and tab away. It doesn't pick one (there are five) and shows "Pick your suburb from the list." Continue won't go on. Type "Richmond VIC" and tab away: it picks Richmond VIC 3121.
- [ ] Type "Bendigo" in full and press Enter: it takes Bendigo VIC 3550 rather than submitting.
- [ ] Arrow keys move down the list, Enter picks, Escape closes it.
- [ ] **Dashboard, Profile, "Based in"** (test coach): change the town by picking from the list, save, reload: it's kept. Type a town without picking: Save is refused with the message.
- [ ] **Dashboard, Profile, Other locations** (needs Clinic): "Add location" only works after a pick, and the box clears after adding.
- [ ] **Account, alerts** (test rider): the "Near" box works the same way.
- [ ] **"Hear when…" box** on a search with no place (signed out): the suburb box works the same way.
- [ ] **Testimonial link** (/testimonial/<slug>): the town box is optional; if filled, it must be picked, and the testimonial shows "Bendigo VIC" (no postcode).
- [ ] **Horse care search card** (/horse-care): typing shows suggestions (states first, then towns). Typing a town and pressing Search without picking still searches, as before.
- [ ] **Admin, Invites**: one "Where they're based" box replaces suburb and state; the invited coach's profile starts with that suburb.
- [ ] **Admin, Guides and Sponsors**: the place box takes a picked suburb. An existing guide or sponsor slot with a place still saves without retyping it.
- [ ] **Admin, Campaigns, audiences**: "Near" takes a picked suburb.
