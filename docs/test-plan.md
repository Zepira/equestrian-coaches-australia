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
