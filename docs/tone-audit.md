# Tone audit: no founders by name, one voice for every equestrian

13 October 2026. Audited every public page, every CMS content block in `src/lib/cms/content-defaults.ts`, the email templates and the legal pages, against the rule agreed with Kim: the site is for all equestrians, it speaks as "we", and nobody who runs it is named or pictured anywhere except, minimally, on the About page.

Short verdict: the site is already in good shape. The plain "we" voice runs through the home page, the two front doors, pricing, sign-up, the dashboard, every email and the legal pages, and none of those name anyone. The founder material is concentrated in seven places, five of them on the About page. Section 1 lists them, section 2 has the replacement copy, section 3 is the prompt to hand to a coding session.

## 1. What was found

| Where | What it says now | Decision |
|---|---|---|
| About page, `about.why` block | "Alana found her coach by accident." Kim named twice in the body. | Rewrite without names (section 2). |
| About page, `about.rider` block and its section in `src/app/about/page.tsx` | First-person bio: first lesson at fifteen, Rosie the mare, "I build software for a living", signed Alana, four fact tiles. | Remove the whole section. |
| About page, `about.coach` block and its section | First-person coaching bio signed Kim, four fact tiles including "Listed here as: a coach like any other". | Remove the whole section. |
| About page, `about.record` block | "We're Alana and Kim, based in south-east Victoria, registering as a partnership." Plus the disclosure that Kim is listed as a coach. | Rewrite: no names, keep the disclosure in general terms (section 2). |
| About page, `about.cta` block | "Two of us built it. Riders and coaches are what make it work." | Rewrite (section 2). |
| About page photos | `about-rosie-*` (the grey mare in sashes, captioned "Rosie") and `about-kim-*` (portrait placeholder captioned "Kim. Portrait to come"). | Remove both. One landscape or arena photo at most, or no photo. The Lisa Gordon permission question goes away with them. |
| /for-coaches, "what we do to bring riders to you" table, `src/app/for-coaches/page.tsx` | "Kim answers the recommendation posts in equestrian Facebook groups. By name, from her own account." | Rewrite (section 2). |
| /for-coaches and /for-professionals, the "Tell us what to fix" box, `src/components/for-coaches/pitch-sections.tsx` | "tell Kim or Alana directly. Every founding coach gets a direct line to us" | Rewrite (section 2). |
| Terms, "Who we are" (`legal.terms` and `docs/legal-pages.md`) | "a partnership between Alana La Bouchardiere and Kim Thompson" | Rewrite to the business name and ABN only, with a note for the solicitor (section 2). |
| Privacy policy, "Who this covers" | Same two names. | Same. |
| Footer, `footer.credit` | "Site by Daiquiri Creative" linking to daiquiricreative.com.au | Keep. Decided 13 Oct: a design credit names who built the site, not who runs it, and the link is deliberate referral traffic for the agency. |
| Code comments in `site-header.tsx`, `signup/page.tsx`, `coming-soon.tsx`, `about/page.tsx` | "Kim's link", "Kim's invites", "Alana and Kim can edit" | Not visible to anyone. Reword in passing to "an invite link", "the admins". |
| Trello card: Kim's 60-second video of herself joining, linked from the sign-up page | Not built yet. | Keep the idea, drop the face: a screen recording of the sign-up with a voiceover, no name on screen. |

Nothing to change in: home page, coaches door, horse care door, list-your-business, pricing plans, FAQ, sign-up and onboarding, dashboard, billing, enquiry and review forms, competitions, guides, riders' choice, how-we-list, review policy, cookies, refunds, every email template, the auth emails, error pages. All already speak as "we" with no names.

Tone beyond names: the existing copy is plain, specific and consistent, and it already follows the site-copy rules. I would not rewrite it for professionalism; the risk is making it blander, not better. Two small things worth tightening while you're in there: "Be the one they call." on the horse care pitch and "Then you're the answer to every search in it" in the FAQ are the two lines closest to salesy, and both can stay.

## 2. Replacement copy

Site-copy rules applied, humanizer pass run: no dashes, sentence case, plain words.

### About page, kept to four blocks

**`about.opening`**: unchanged. No names in it.

**`about.why`**, replaces the "found her coach by accident" block:

- eyebrow: "Why it exists"
- title: "Most riders find their coach *by accident.*"
- paragraphs: ["A post turns up in a feed, a friend mentions a name, someone at a clinic points across the arena. It works if you already know people. If you're new, you've moved, or you want something more specific than general ridden work, it mostly doesn't. For some disciplines there are only a handful of coaches in the country, and no way to go looking for one on purpose."]
- pullQuote: unchanged ("Somewhere a rider is looking for a liberty coach... *And neither of them will ever hear about the other.*")
- closing: "A directory is an unglamorous fix for that. But it is the fix."

**`about.rider`** and **`about.coach`**: deleted, and their two sections and photos removed from `src/app/about/page.tsx`.

**`about.principles`**: unchanged. It is the strongest part of the page and names nobody.

**`about.record`**, replaces "We're Alana and Kim":

- recordEyebrow: "Who runs it, for the record"
- recordTitle: "An independent Australian business, run by people who ride."
- recordBody: "Equine Professionals Australia is a small partnership based in regional Victoria. It isn't owned by a publisher, a governing body or a coaching business. One of the people behind it coaches, and is listed here like any other coach: no ranking advantage, no editorial preference, no discount. If that ever changes, we'll say so here."
- newEyebrow, newTitle, newBody, email: unchanged.

**`about.cta`**:

- title: "Built by riders. *Riders and professionals* are what make it work."
- everything else unchanged.

That is the whole About page: why it exists, how we do things, who runs it, and the two buttons. About a third of its current length.

### /for-coaches, the "what we do" table

Replace the Kim row with:

- title: "We answer the recommendation posts in equestrian Facebook groups"
- body: "From a real account, naming real coaches on the site. Never an ad, and never a template."

### "Tell us what to fix" box (both pitch pages)

Replace the feedback string with:

"This site is new and we'd rather hear what's not working from you than guess. If something's confusing, missing or just annoying, email us and a person who runs the site reads it, not a ticket queue. Founding members get a reply within two business days."

### Terms, "Who we are"

"Equine Professionals Australia is a partnership registered in Victoria, trading as Equine Professionals Australia, ABN 74 931 177 211. When these terms say "we" or "us", that's who they mean. You can reach us at {contact_email}. We answer email within two business days."

Note for the solicitor: the partners' names are on the public ABN register under that number. If they advise the partners should be named in the terms themselves, add one sentence here and nowhere else on the site.

### Privacy policy, "Who this covers"

"Equine Professionals Australia, a partnership registered in Victoria, ABN 74 931 177 211. Privacy questions and requests go to {contact_email}."

### Footer credit

Stays as it is. "Site by Daiquiri Creative" is a design credit, not a founder reference, and the link is wanted.

## 3. The prompt for a coding session

Paste this into a session with the repo open.

---

Remove every reference to the people who run Equine Professionals Australia from the public site, so it speaks only as "we" and is for all equestrians. The full audit and the replacement copy are in `docs/tone-audit.md`; use that copy word for word. Follow `.claude/skills/site-copy/SKILL.md` for any line you have to write yourself, and run the humanizer pass on it.

1. `src/lib/cms/content-defaults.ts`: replace `about.why`, `about.record` and `about.cta` with the versions in the audit's section 2. Delete the `about.rider` and `about.coach` entries, and remove their keys from `src/lib/cms/registry.ts` and from any admin page editor that lists them. Leave `about.opening` and `about.principles` as they are.
2. `src/app/about/page.tsx`: delete the rider section and the coach section (the two `getContent` calls, their JSX, and the Rosie and Kim picture elements). Remove the PENDING notes at the bottom of the file that refer to Kim's bio and the photo permissions. Delete the `about-rosie-*` and `about-kim-*` files from `public/hero/` and from `scripts/build-hero-images.mjs` if it generates them. The page should read: opening, why, principles, record, cta.
3. `src/app/for-coaches/page.tsx`: replace the row whose title starts "Kim answers" with the row in the audit.
4. `src/components/for-coaches/pitch-sections.tsx`: replace the `feedback` string in `PitchQuestions` with the one in the audit.
5. `legal.terms` "Who we are" and `legal.privacy` "Who this covers" in `content-defaults.ts`: replace with the audit's wording. Make the same change in `docs/legal-pages.md` sections 1 and 2.
6. Footer: leave the "Site by Daiquiri Creative" credit and its link exactly as they are. It is a design credit, not a founder reference.
7. Code comments that name Kim or Alana (`site-header.tsx`, `signup/page.tsx`, `coming-soon.tsx`, `about/page.tsx`): reword to "an invite link", "the admins", "the site owners".
8. Because the live site reads content from database rows, not the defaults: write a one-off script under `scripts/db/` that upserts the changed `about.*`, `legal.*`, `footer` and `for_coaches` rows from the new defaults (or extend `seed-content.mjs` with a `--only about.why,about.record,...` flag), and delete the `about.rider` and `about.coach` rows. Say in the summary exactly which command to run against the test database.
9. Verify: grep `src/` and `content/` for `Alana`, `Kim`, `Rosie`, `Heartland`, `Thompson`, `Bouchardiere`. The only allowed hits are inside `content/handbook/` (internal planning documents) and `CLAUDE.md`. `Daiquiri` is allowed in the footer block and nowhere else. Run `npm run build`, then the smoke suites that cover the about page and the pitch pages (`scripts/design-reference/site-sweep.mjs`, `scripts/design-reference/for-coaches-behaviour.mjs`) and fix any baseline that referenced the removed sections.
10. Update `CLAUDE.md` with a short dated note: the site names nobody who runs it; the About page is four blocks; any future copy that mentions a founder by name is a bug.

Don't touch `content/handbook/`, the partnership documents, or anything under `Claude outputs/`. Don't rewrite copy the audit says is fine.

---
