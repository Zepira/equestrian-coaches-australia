// R7 provider-dashboard smoke test, re-baselined for the CMS schema
// (24 Sep 2026: providers / provider_members / subscriptions / provider_terms /
// provider_events / events). A throwaway coach made through the real sign-up
// trigger, published, on a mock Spotlight plan, with seeded provider_events /
// enquiries / one upcoming event. Logs in through the real form and checks:
// overview tiles and deltas equal SQL, the 12-month chart bars are the SQL
// month counts at proportional heights, the summary line, the enquiries
// badge, completeness (computed from the profession row + plan
// capabilities), latest enquiries, next event, the taking-students control
// (persists + the public /profile page), the enquiry status cycle, a profile
// save round trip, the events page on Spotlight, a mock plan change to Listed
// (written to `subscriptions`, profile stays published) and the Listed event
// cap, and the header's dashboard mode. Deletes everything it made.
//
//   node scripts/smoke/r7-dashboard.mjs [--base http://localhost:3110]
//
// Changed from the pre-CMS version: plan and status come from
// `subscriptions` / providers.status (never coach_profiles), years_coaching is
// years_experience, travels_to_rider is travels_to_client, public profiles
// are /profile/[slug], the Clinics tab is now "Events" in the nav (the page
// still says "Clinics"), and expected numbers are computed from SQL rather
// than hard-coded so the test holds on the first days of a month.
// Dropped: the "tier enum rename" check (the rename happened in the baseline;
// there is nothing left to rename) and the "published: true" side effect of a
// plan change (billing never publishes any more; review does).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ref = new URL(URL_).hostname.split(".")[0];
const db = new pg.Client({ connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(env.DATABASE_PASSWORD)}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`, ssl: { rejectUnauthorized: false } });
await db.connect();
const service = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const args = process.argv.slice(2);
const base = (args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3110").replace(/\/$/, "");
let failed = 0;
let passed = 0;
const row = (ok, label, detail = "") => { if (ok) passed++; else failed++; console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`); };
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const settle = (p) => p.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
/** Run `act` and wait for the server action's POST to answer. */
const posted = async (page, act) => {
  const resp = page.waitForResponse((r) => r.request().method() === "POST" && r.url().startsWith(base), { timeout: 20000 });
  await act();
  await resp;
  await settle(page);
};

const stamp = Date.now();
const email = `r7-coach-${stamp}@example.com`;
const password = "Throwaway-1234!";
const slug = `r7-isabella-${stamp}`;
let userId, providerId, browser;
try {
  // ── seed ────────────────────────────────────────────────────────────────
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "provider", name: "Isabella Fletcher", profession: "coaches" } });
  if (error) throw error;
  userId = data.user.id;
  [{ provider_id: providerId } = {}] = await q(`select provider_id from provider_members where user_id=$1`, [userId]);
  row(Boolean(providerId), "sign-up trigger made the provider + owner membership");
  const [{ id: coaches }] = await q(`select id from terms where kind='profession' and slug='coaches'`);
  const [{ id: dressage }] = await q(`select id from terms where kind='discipline' and slug='dressage'`);
  const [bendigo] = await q(`select postcode, lat, long, area_id from postcodes where suburb ilike 'Bendigo' and state='VIC' order by postcode limit 1`);
  await q(
    `update providers set slug=$2, headline='Dressage from first flatwork through to competition tests.',
       bio='Isabella has coached around Bendigo for seven years, working mostly with adult riders who want their flatwork to feel less like a fight. Lessons run at her own arena.',
       suburb='Bendigo', state='VIC', postcode=$3, lat=$4, long=$5, area_id=$6,
       location=st_setsrid(st_makepoint($5,$4),4326)::geography,
       contact_phone='0412 000 000', show_contact_phone=true, availability='yes',
       status='published', submitted_at=now(), published_at=now(), updated_at=now()
     where id=$1`,
    [providerId, slug, bendigo.postcode, bendigo.lat, bendigo.long, bendigo.area_id]
  );
  await q(`insert into subscriptions (provider_id, tier, status, founding, stripe_customer_id) values ($1,'spotlight','active',true,'mock_r7')`, [providerId]);
  await q(`insert into provider_terms (provider_id, term_id, sort_order) values ($1,$2,1)`, [providerId, dressage]);
  // events: this month 5 impressions / 3 views / 2 reveals; last month 1 view; 8 months ago 4 views
  const ev = [];
  for (let i = 0; i < 5; i++) ev.push(`($1,$2,'impression','h${i}', now())`);
  for (let i = 0; i < 3; i++) ev.push(`($1,$2,'view','v${i}', now())`);
  for (let i = 0; i < 2; i++) ev.push(`($1,$2,'reveal','r${i}', now())`);
  ev.push(`($1,$2,'view','p1', date_trunc('month', now()) - interval '10 days')`);
  for (let i = 0; i < 4; i++) ev.push(`($1,$2,'view','o${i}', date_trunc('month', now()) - interval '8 months' + interval '3 days')`);
  await q(`insert into provider_events (provider_id, profession_id, kind, visitor_hash, created_at) values ${ev.join(",")}`, [providerId, coaches]);
  await q(
    `insert into enquiries (provider_id, profession_id, rider_name, rider_contact, want, message, status, created_at) values
    ($1,$2,'Megan Hartley','megan@example.com','regular','Adult returning rider, 12yo TB gelding who rushes in canter.','new', now() - interval '2 hours'),
    ($1,$2,'Cara Nguyen','0400 222 333','regular','My daughter is 11 and wants to move up from Preliminary.','new', now() - interval '3 hours'),
    ($1,$2,'Josh Whitfield','josh@example.com','one_off','Test-riding session before the Kyneton comp?','replied', now() - interval '4 hours')`,
    [providerId, coaches]
  );
  await q(
    `insert into events (provider_id, profession_id, term_id, title, location_text, start_date, capacity, places_left)
     values ($1,$2,$3,'Test Riding Day: Preliminary to Elementary','Strathfieldsaye VIC', current_date + 30, 12, 6)`,
    [providerId, coaches, dressage]
  );

  // ── what the page should say, from SQL (the app counts in UTC months) ────
  const now = new Date();
  const monthStart = (n) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + n, 1));
  const count = async (table, kind, from, to) =>
    (await q(`select count(*)::int as n from ${table} where provider_id=$1 ${kind ? "and kind=$4" : ""} and created_at >= $2 and created_at < $3`, kind ? [providerId, from, to, kind] : [providerId, from, to]))[0].n;
  const month = async (from, to) => ({
    impressions: await count("provider_events", "impression", from, to),
    views: await count("provider_events", "view", from, to),
    reveals: await count("provider_events", "reveal", from, to),
    enquiries: await count("enquiries", null, from, to),
  });
  const cur = await month(monthStart(0), monthStart(1));
  const prev = await month(monthStart(-1), monthStart(0));
  const fmtDelta = (n) => (n === 0 ? "—" : `${n > 0 ? "+" : "−"}${Math.abs(n)}`);
  const trend = [];
  for (let i = -11; i <= 0; i++) trend.push(await count("provider_events", "view", monthStart(i), monthStart(i + 1)));
  const maxViews = Math.max(1, ...trend);
  const [{ n: newCount }] = await q(`select count(*)::int as n from enquiries where provider_id=$1 and status='new'`, [providerId]);
  const [pd] = await q(`select d.audience_noun, d.completeness from profession_details d where d.term_id=$1`, [coaches]);
  const [{ value: capsRaw }] = await q(`select value from settings where key='plan_capabilities'`);
  const [{ value: plansRaw }] = await q(`select value from settings where key='plans'`);
  const caps = JSON.parse(capsRaw);
  const plans = JSON.parse(plansRaw);
  const items = (pd.completeness?.length ? pd.completeness : [{ key: "photo", weight: 1 }, { key: "bio", weight: 1 }, { key: "terms", weight: 1 }, { key: "location", weight: 1 }, { key: "testimonials", weight: 1 }, { key: "video", weight: 1 }])
    .filter((i) => i.key !== "video" || caps.spotlight.video);
  const doneKeys = new Set(["bio", "terms", "location"]); // no photo, testimonials or video seeded
  const totalW = items.reduce((n, i) => n + i.weight, 0);
  const expectPct = Math.round((items.filter((i) => doneKeys.has(i.key)).reduce((n, i) => n + i.weight, 0) / totalW) * 100);
  const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const prevMonthName = MONTH_FULL[(now.getMonth() + 11) % 12];

  // ── log in ──────────────────────────────────────────────────────────────
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${base}/login`, { waitUntil: "load" }); await settle(page);
  await page.locator("main input[type=email]").first().fill(email);
  await page.locator("main input[type=password]").first().fill(password);
  await page.locator("main button[type=submit]").first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  await settle(page);

  // ── overview ────────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard`, { waitUntil: "load" }); await settle(page);
  const text = await page.locator("main").innerText();
  row(/Good month, Isabella\./.test(text), "overview: greeting uses the first name");
  row(!/isn.t live yet|having a look at your profile/.test(text), "overview: no status banner for a published profile");
  const tiles = await page.locator("[data-stat] span.font-display").allInnerTexts();
  const expectTiles = [cur.impressions, cur.views, cur.reveals, cur.enquiries].join(",");
  row(tiles.join(",") === expectTiles, `overview: tiles = SQL (${expectTiles})`, tiles.join(","));
  const deltas = await page.locator("[data-stat] [data-delta]").allInnerTexts();
  const expectDeltas = ["impressions", "views", "reveals", "enquiries"].map((k) => fmtDelta(cur[k] - prev[k])).join(",");
  row(deltas.join(",") === expectDeltas, `overview: deltas vs last month = SQL (${expectDeltas})`, deltas.join(","));
  const bars = await page.locator("[data-chart] [data-views]").evaluateAll((els) => els.map((e) => [Number(e.dataset.views), parseFloat(e.style.height)]));
  const expectBars = trend.map((v) => [v, Math.max(2, Math.round((v / maxViews) * 100))]);
  row(JSON.stringify(bars) === JSON.stringify(expectBars), "overview: 12 bars = SQL month counts, heights proportional", JSON.stringify(bars.map((b) => b[0])));
  row(trend[3] === 4 && trend[11] === cur.views, "overview: seeded months landed where expected (8 months ago = 4)", JSON.stringify(trend));
  const audience = cur.reveals === 1 ? pd.audience_noun : `${pd.audience_noun}s`;
  const expectSummary = `${cur.reveals} ${audience} tapped to see your number, ${cur.reveals - prev.reveals >= 0 ? "up" : "down"} from ${prev.reveals} in ${prevMonthName}.`;
  row(text.includes(expectSummary), "overview: summary line from real reveals", expectSummary);
  const badge = await page.locator("nav[aria-label=Dashboard]:visible a[href='/dashboard/enquiries'] span").first().innerText().catch(() => "");
  row(badge === String(newCount), `nav badge shows ${newCount} new enquiries`, badge);
  const pct = await page.locator("[data-complete]").first().innerText();
  row(pct === `${expectPct}%`, `completeness ${expectPct}% (bio, disciplines, location of ${items.length})`, pct);
  const latest = await page.locator("[data-latest]").innerText();
  row(/Megan Hartley/.test(latest) && /Cara Nguyen/.test(latest) && /Josh Whitfield/.test(latest), "latest enquiries listed");
  const nextEvent = await page.locator("[data-next-clinic]").innerText();
  row(/Test Riding Day/.test(nextEvent) && /6 places left/.test(nextEvent), "next event card");
  const planRail = await page.locator("[data-plan-rail]").innerText();
  row(planRail.includes(plans.spotlight.name), "nav rail shows the plan from subscriptions", planRail.replace(/\n/g, " "));

  // taking students → persists + public profile
  await posted(page, () => page.locator("[role=radiogroup]:visible [role=radio]", { hasText: "Waitlist" }).first().click());
  const [ts] = await q(`select availability::text as a from providers where id=$1`, [providerId]);
  row(ts.a === "waitlist", "taking-students switch persisted to the DB", ts.a);
  const pubRes = await fetch(`${base}/profile/${slug}`);
  const pub = await pubRes.text();
  row(pubRes.status === 200 && pub.includes("Waitlist open"), "public profile (/profile/[slug]) shows Waitlist open", String(pubRes.status));

  // ── enquiries ───────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/enquiries`, { waitUntil: "load" }); await settle(page);
  row((await page.locator("[data-enquiry]:visible").count()) === 3, "inbox: three rows");
  const firstBtn = page.locator("[data-enquiry]:visible button[data-status]").first();
  row((await firstBtn.getAttribute("data-status")) === "new", "inbox: newest is New");
  await posted(page, () => firstBtn.click());
  await page.waitForFunction(() => document.querySelector("[role=table] [data-enquiry] button[data-status]")?.getAttribute("data-status") === "replied", null, { timeout: 5000 }).catch(() => {});
  row((await firstBtn.getAttribute("data-status")) === "replied", "inbox: tap cycles to Replied");
  const [e1] = await q(`select status::text as s from enquiries where provider_id=$1 and rider_name='Megan Hartley'`, [providerId]);
  row(e1.s === "replied", "inbox: status persisted", e1.s);
  row((await page.locator("[data-enquiry]:visible a[href^='mailto:']").count()) >= 1 && (await page.locator("[data-enquiry]:visible a[href^='tel:']").count()) >= 1, "inbox: mailto for email, tel for mobile");

  // ── profile ─────────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/profile`, { waitUntil: "load" }); await settle(page);
  row(/Preview as a rider/.test(await page.locator("main").innerText()), "profile: preview link");
  row((await page.locator(`main a[href='/profile/${slug}']`).count()) >= 1, "profile: preview goes to /profile/[slug]");
  await page.locator("input[name=travel_radius_km]").fill("60");
  await page.locator("input[name=years_experience]").fill("7");
  await page.locator("input[name=contact_email]").fill("isabella@example.com");
  await page.locator("input[name=show_contact_email]").check({ force: true });
  await posted(page, () => page.locator("#profile-form button[type=submit]").click());
  const [cp] = await q(`select travel_radius_km, years_experience, travels_to_client, show_contact_email, contact_email, suburb, postcode, area_id from providers where id=$1`, [providerId]);
  row(cp.travel_radius_km === 60 && cp.years_experience === 7 && cp.travels_to_client === true && cp.show_contact_email === true && cp.contact_email === "isabella@example.com", "profile: radius / years / email switch round-trip", JSON.stringify(cp));
  row(cp.suburb === "Bendigo" && cp.postcode === bendigo.postcode && cp.area_id === bendigo.area_id, "profile: location kept (suburb, postcode, area_id)");
  const terms = await q(`select t.kind::text as kind, t.slug from provider_terms pt join terms t on t.id=pt.term_id where pt.provider_id=$1 order by t.kind, pt.sort_order`, [providerId]);
  row(terms.some((t) => t.kind === "profession" && t.slug === "coaches") && terms.some((t) => t.kind === "discipline" && t.slug === "dressage"), "profile: save keeps the profession row and the discipline", JSON.stringify(terms));

  // ── events (the "Clinics" page) ─────────────────────────────────────────
  await page.goto(`${base}/dashboard/clinics`, { waitUntil: "load" }); await settle(page);
  const ct = await page.locator("main").innerText();
  row(/Test Riding Day/.test(ct) && /6 places left/.test(ct) && /0 riders emailed/.test(ct), "events: card shows places + riders emailed");
  row(/Every clinic or event gets its own page/.test(ct), "events: unlimited-plan note on Spotlight");
  row((await page.locator("#new-clinic").count()) === 1, "events: new-event form present on Spotlight");

  // ── billing ─────────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/billing`, { waitUntil: "load" }); await settle(page);
  row((await page.locator("[data-plan-card] p.font-display").first().innerText()) === plans.spotlight.name, `billing: plan card shows ${plans.spotlight.name}`);
  row((await page.locator("button[data-plan=spotlight][aria-current=true]").count()) === 1, "billing: current plan marked");
  await posted(page, () => page.locator("button[data-plan=listed]").click());
  await page.waitForURL((u) => u.searchParams.get("changed") === "1", { timeout: 10000 }).catch(() => {});
  await settle(page);
  const [after] = await q(`select s.tier::text as t, s.status::text as s, p.status::text as ps from subscriptions s join providers p on p.id=s.provider_id where s.provider_id=$1`, [providerId]);
  row(after.t === "listed" && after.s === "active", "billing: change plan → Listed written to subscriptions (mock)", JSON.stringify(after));
  row(after.ps === "published", "billing: plan change leaves the profile published", after.ps);
  row(/Plan changed/.test(await page.locator("main").innerText()), "billing: confirmation shown");
  await page.goto(`${base}/dashboard/clinics`, { waitUntil: "load" }); await settle(page);
  const ct2 = await page.locator("main").innerText();
  row(/includes one live clinic at a time/.test(ct2) && (await page.locator("#new-clinic").count()) === 0, "events: Listed with one upcoming event is at its cap (form hidden)");

  // header dashboard mode
  const hdr = await page.locator("header.site-header").innerText();
  row(/View public profile/.test(hdr) && /Isabella/.test(hdr), "header: dashboard mode (View public profile + first name)");
  row((await page.locator(`header.site-header a[href='/profile/${slug}']`).count()) >= 1, "header: public profile link is /profile/[slug]");
  row(errs.length === 0, "no page errors", errs.slice(0, 2).join(" | "));
  await page.close();
} catch (e) {
  row(false, "script error", e.message);
} finally {
  await browser?.close();
  if (providerId) await q(`delete from providers where id=$1`, [providerId]);
  if (userId) await service.auth.admin.deleteUser(userId);
  await q(`delete from contacts where lower(email)=$1`, [email]);
  const left = providerId
    ? await q(
        `select (select count(*) from providers where id=$1)::int + (select count(*) from enquiries where provider_id=$1)::int
          + (select count(*) from provider_events where provider_id=$1)::int + (select count(*) from events where provider_id=$1)::int
          + (select count(*) from subscriptions where provider_id=$1)::int + (select count(*) from profiles where id=$2)::int
          + (select count(*) from contacts where lower(email)=$3)::int as n`,
        [providerId, userId, email]
      )
    : [{ n: 0 }];
  row(left[0].n === 0, "cleanup: throwaway provider, user and contact gone");
  await db.end();
}
console.log(failed ? `\n${passed} ok, ${failed} FAIL` : `\nall ${passed} ok`);
process.exit(failed ? 1 : 0);
