# Launch

What to change, in what order, to turn the coming soon page into the site. The
code does not change: every step here is a setting, a DNS record or an
environment variable.

Read alongside `src/lib/launch.ts`, which decides what each host serves, and
`.env.example`, which documents every variable.

## How the two hosts work

One Vercel project, one deployment, three behaviours, all decided in
`src/proxy.ts` from the request's host name.

| Host | Before launch | After launch |
|---|---|---|
| `equineprofessionals.com.au` | the coming soon page, indexable, nothing else reachable | the whole site, indexable |
| `www.` and `equineprofessionals.au` | 301 to the bare domain | the same |
| `test.equineprofessionals.com.au` | the whole site behind a password, never indexed | unchanged |
| the project's own `*.vercel.app`, and any preview | the same password, never indexed | unchanged |

Gated is the default, not a list. A host nobody thought about gets the password
and the noindex header without anyone remembering to add it, which is what
keeps the `*.vercel.app` address out of the index. Everything fails closed: no
`SITE_LAUNCHED` means not launched, no `PUBLIC_HOST` means no host is public,
and a gated host with no password set serves a 503 rather than the site.

## Before launch

### DNS, at the registrar

Take the exact record values from the Vercel dashboard when you add each
domain. Vercel shows them per project and its apex IP has changed before, so a
value copied from anywhere else is a guess.

| Record | Host | Points to |
|---|---|---|
| A | `equineprofessionals.com.au` | Vercel's apex IP, from the dashboard |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `test` | `cname.vercel-dns.com` |
| A | `equineprofessionals.au` | the same apex IP |

Add all four to the one Vercel project. Do **not** set up the www or `.au`
redirect in the Vercel dashboard: `REDIRECT_HOSTS` and the proxy already do it,
and two mechanisms would make a redirect chain. If the registrar has CAA
records, they must permit `letsencrypt.org` or certificates will not issue.

### Email, at Resend

Verify `equineprofessionals.com.au`, which is the domain
`src/lib/resend.ts` already sends from. Resend generates the DKIM and SPF
records per domain, so copy them from its dashboard; it will probably ask you to
send from a subdomain such as `send.`, which needs its own MX and SPF TXT. Add a
DMARC record yourself at `_dmarc`, starting at `v=DMARC1; p=none;`, so you get
reports without anything bouncing while the domain is new.

### Supabase Auth, for the test host

Authentication → URL Configuration. Site URL stays the production domain. Add
these to Redirect URLs, or sign-up confirmation and password reset will bounce
people to the wrong host:

```
https://test.equineprofessionals.com.au/auth/callback
https://test.equineprofessionals.com.au/auth/callback?next=*
https://equineprofessionals.com.au/auth/callback
https://equineprofessionals.com.au/auth/callback?next=*
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=*
```

Both flows go through `/auth/callback` with a `next` parameter:
`src/app/signup/signup-form.tsx` and `src/app/forgot-password/page.tsx` build it
from `window.location.origin`, so each host sends people back to itself.

### Stripe, in test mode

Create a **test mode** webhook endpoint at
`https://test.equineprofessionals.com.au/api/webhooks/stripe`, sending the
events `src/app/api/webhooks/stripe/route.ts` handles, and put its signing
secret in `STRIPE_WEBHOOK_SECRET` on the deployment.

Keep `STRIPE_SECRET_KEY` on a test key until launch. `src/lib/stripe.ts` throws
on startup if a live key is set while `SITE_LAUNCHED` is not true, so the swap
has to happen in the order below.

### Environment variables on Vercel

```
PUBLIC_HOST=equineprofessionals.com.au
SITE_LAUNCHED=false
REDIRECT_HOSTS=equineprofessionals.au,www.equineprofessionals.au
TEST_AUTH_USER=<pick one>
TEST_AUTH_PASSWORD=<pick one>
NEXT_PUBLIC_SITE_URL=https://test.equineprofessionals.com.au
CRON_EMAILS_ENABLED=false
```

`NEXT_PUBLIC_SITE_URL` on the test host means every canonical tag, sitemap
entry, structured-data URL, email link and Stripe return URL on the test site
points at the test site. Nothing there links to the production domain.

### Run the waitlist migration

```
npm install --no-save pg
node scripts/db/run-migration.mjs supabase/migrations/0010_waitlist.sql
```

Then seed the two new content blocks, so the coming soon page and its
confirmation email are editable in admin rather than falling back to code:

```
node --experimental-strip-types scripts/db/seed-content.mjs
```

## Checking it

With a production build running locally:

```
npm run build
PUBLIC_HOST=equineprofessionals.com.au SITE_LAUNCHED=false \
  REDIRECT_HOSTS=equineprofessionals.au \
  TEST_AUTH_USER=kim TEST_AUTH_PASSWORD=hoofbeats npm start
node scripts/launch/host-gate.mjs
```

That covers the public host showing only the coming soon page, `/admin` being
unreachable on it, the test host asking for a password, the cron and Stripe
webhook paths getting through anyway, the noindex header, and robots.txt
differing by host. Two more runs cover the rest:

```
# started without TEST_AUTH_USER / TEST_AUTH_PASSWORD
node scripts/launch/host-gate.mjs --mode nopassword
# started with SITE_LAUNCHED=true
node scripts/launch/host-gate.mjs --mode launched
```

The waitlist has its own script, which drives the real form in a browser:

```
node scripts/launch/waitlist.mjs --base http://localhost:3000
```

It checks the page, the profession picker appearing only for a horse care
professional, an address and a consent box that are both required, and that the
form posts and answers **with JavaScript off** as well as on. When `.env` has
Supabase credentials it goes further: it signs up through the form, reads the
row back (role, profession, consent and its timestamp, source, a hashed rather
than stored IP), checks the same address twice makes one row, presses the
unsubscribe link, and deletes the test rows after. Without credentials it says
so and skips that half rather than passing quietly.

**If an insert fails with "Could not find the table 'public.waitlist' in the
schema cache"**, PostgREST has not noticed the new table yet. It usually picks
it up within a few seconds; if not, reload the schema from the Supabase
dashboard (API → Reload schema) or run `notify pgrst, 'reload schema';`.

## Launch day, in order

1. **Wipe and rebuild the database** if the test data is not worth keeping:
   `node scripts/db/rebuild.mjs --yes-wipe`, then `seed-content.mjs`. Do this
   **before** anything below. It drops the `public` schema, the waitlist with
   it, so export the list first from Admin → Waitlist → Download CSV.
2. The rebuild runs every numbered migration after the baseline, `0010_waitlist`
   included, so the table comes back. Its **rows do not**: `rebuild.mjs` only
   restores accounts, admins and providers, so the CSV from step 1 is the only
   copy of the list.
3. **Set `SITE_LAUNCHED=true`** and change `NEXT_PUBLIC_SITE_URL` to
   `https://equineprofessionals.com.au`.
4. **Swap Stripe to live**: live `STRIPE_SECRET_KEY`, a new **live mode**
   webhook at `https://equineprofessionals.com.au/api/webhooks/stripe`, and its
   signing secret in `STRIPE_WEBHOOK_SECRET`. After step 3, never before: the
   guard in `src/lib/stripe.ts` refuses a live key on an unlaunched deployment.
5. **Set `CRON_EMAILS_ENABLED=true`**, or the monthly rider round-up, the
   monthly provider numbers and the founding reminders will keep logging
   instead of sending, silently.
6. **Redeploy.** Environment variables only take effect on a new deployment.
7. **In admin:** set the launch date on Settings, which locks and starts every
   founding member's free period; turn off `show_sample_listings`; set
   `review_alert_emails`; mark the terms and privacy policy approved once the
   solicitor has signed them off.
8. **Verify the domain in Search Console** as a Domain property, using the TXT
   record it gives you, and set `GSC_SITE_URL` to
   `sc-domain:equineprofessionals.com.au`. A Domain property covers every
   subdomain, so the test host's data lands in the same property; that is
   harmless for reporting, and another reason its noindex has to be right.
9. **Submit the sitemap**: `https://equineprofessionals.com.au/sitemap.xml`.
10. **Email the waitlist.** Export the CSV from Admin → Waitlist. Everyone on
    it consented to exactly this one email, and anyone who unsubscribed is
    already left out of the file.
11. **Run the checks again** against the live site:
    `node scripts/launch/host-gate.mjs --base https://equineprofessionals.com.au --mode launched`.

## Two things about the Vercel plan

**Hobby is for non-commercial use.** Vercel defines commercial broadly enough to
include advertising a product or service, and any deployment involved in the
financial gain of anyone who produced it, a paid consultant included. A waitlist
page for a business that will charge for listings reads as commercial on that
definition. It is a licence term rather than a quota, so the consequence is
account suspension, not an invoice. Alana's call is to move to Pro at launch.

**Cron frequency, not count, is the Hobby limit that bites.** All five jobs in
`vercel.json` run daily or less often, which Hobby allows. Two things to know:
Hobby fires within the hour rather than on the minute, and it is UTC only, so
the Monday 07:00 digest arrives at 17:00 Monday Australian eastern time. Sources
disagree on whether the count cap is two per team or a hundred per project, so
confirm in the dashboard before adding a sixth.
