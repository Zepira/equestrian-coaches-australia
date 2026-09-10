// R7 coach-dashboard smoke test. Throwaway coach on a mock Spotlight plan
// with seeded events / enquiries / a clinic; logs in through the real form
// and checks every tab: stats equal SQL, chart bars proportional, badge =
// new enquiries, taking-students persists + shows on the public profile,
// status cycle persists, profile save round-trips the new fields, clinics
// list + Listed cap, billing plan change writes the tier, tier enum rename.
// Deletes the user after. Needs `pg` (devDependency) and the dev server.
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
const service = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY);
const base = "http://localhost:3000";
let failed = 0;
const row = (ok, label, detail = "") => { if (!ok) failed++; console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`); };
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const settle = (pg) => pg.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

const stamp = Date.now();
const email = `r7-coach-${stamp}@example.com`;
const password = "Throwaway-1234!";
let coachId, browser;
try {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "coach", name: "Isabella Fletcher" } });
  if (error) throw error;
  coachId = data.user.id;
  await new Promise((r) => setTimeout(r, 800));
  const [{ id: dressageId }] = await q(`select id from terms where kind='discipline' and slug='dressage'`);
  const slug = `r7-isabella-${stamp}`;
  await q(
    `insert into coach_profiles (id, slug, headline, bio, suburb, state, postcode, location, lat, long, published, subscription_status, subscription_tier, stripe_customer_id, contact_phone, show_contact_phone, taking_students)
     values ($1,$2,'Dressage from first flatwork through to competition tests.','Isabella has coached around Bendigo for seven years, working mostly with adult riders who want their flatwork to feel less like a fight. Lessons run at her own arena.','Bendigo','VIC','3550', st_setsrid(st_makepoint(144.2786,-36.7642),4326)::geography, -36.7642, 144.2786, true, 'active', 'spotlight', 'mock_x', '0412 000 000', true, 'yes')`,
    [coachId, slug]
  );
  await q(`insert into coach_terms (coach_id, term_id, sort_order) values ($1,$2,0)`, [coachId, dressageId]);
  // events: this month 5 impressions / 3 views / 2 reveals; last month 1 view; 8 months ago 4 views
  const ev = [];
  for (let i = 0; i < 5; i++) ev.push(`($1,'impression','h${i}', now())`);
  for (let i = 0; i < 3; i++) ev.push(`($1,'view','v${i}', now())`);
  for (let i = 0; i < 2; i++) ev.push(`($1,'reveal','r${i}', now())`);
  ev.push(`($1,'view','p1', date_trunc('month', now()) - interval '10 days')`);
  for (let i = 0; i < 4; i++) ev.push(`($1,'view','o${i}', date_trunc('month', now()) - interval '8 months' + interval '3 days')`);
  await q(`insert into coach_events (coach_id, kind, visitor_hash, created_at) values ${ev.join(",")}`, [coachId]);
  await q(`insert into enquiries (coach_id, rider_name, rider_contact, want, message, status, created_at) values
    ($1,'Megan Hartley','megan@example.com','regular','Adult returning rider, 12yo TB gelding who rushes in canter.','new', now() - interval '2 days'),
    ($1,'Cara Nguyen','0400 222 333','regular','My daughter is 11 and wants to move up from Preliminary.','new', now() - interval '5 days'),
    ($1,'Josh Whitfield','josh@example.com','one_off','Test-riding session before the Kyneton comp?','replied', now() - interval '8 days')`, [coachId]);
  const [{ id: clinicId }] = await q(`insert into clinics (coach_id, title, discipline_id, location_text, start_date, capacity, places_left) values ($1,'Test Riding Day — Preliminary to Elementary',$2,'Strathfieldsaye VIC', current_date + 30, 12, 6) returning id`, [coachId, dressageId]);

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${base}/login`, { waitUntil: "load" }); await settle(page);
  await page.locator("input[type=email], input[name=email]").first().fill(email);
  await page.locator("input[type=password]").first().fill(password);
  await page.locator("form button[type=submit]").first().click();
  await page.waitForTimeout(3500);

  // ── overview ──────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard`, { waitUntil: "load" }); await settle(page);
  await page.waitForTimeout(800);
  const text = await page.locator("main").innerText();
  row(/Good month, Isabella\./.test(text), "overview: greeting uses the first name");
  const tiles = await page.locator("[data-stat] span.font-display").allInnerTexts();
  row(tiles.join(",") === "5,3,2,3", "overview: tiles = 5 impressions / 3 views / 2 reveals / 3 enquiries", tiles.join(","));
  const deltas = await page.locator("[data-stat] [data-delta]").allInnerTexts();
  row(deltas[1] === "+2", "overview: views delta +2 vs last month (3 − 1)", deltas.join(","));
  const bars = await page.locator("[data-chart] [data-views]").evaluateAll((els) => els.map((e) => [Number(e.dataset.views), parseFloat(e.style.height)]));
  row(bars.length === 12 && bars[11][0] === 3 && bars[11][1] === 75 && bars[3][0] === 4 && bars[3][1] === 100, "overview: 12 bars, heights proportional (4 → 100%, 3 → 75%)", JSON.stringify(bars.map((b) => b[0])));
  row(/2 riders tapped to see your number, up from 0 in/.test(text), "overview: summary line from real reveals");
  const badge = await page.locator("nav[aria-label=Dashboard] a[href='/dashboard/enquiries'] span").first().innerText().catch(() => "");
  row(badge === "2", "nav badge shows 2 new enquiries", badge);
  const pct = await page.locator("[data-complete]").first().innerText();
  row(pct === "50%", "completeness 50% (bio, disciplines, location of six)", pct);
  const latest = await page.locator("[data-latest]").innerText();
  row(/Megan Hartley/.test(latest) && /Cara Nguyen/.test(latest) && /Josh Whitfield/.test(latest), "latest enquiries listed");
  row(/Test Riding Day/.test(text) && /6 places left/.test(text), "next clinic card");

  // taking students → persists + public profile
  await page.locator("[role=radiogroup] [role=radio]", { hasText: "Waitlist" }).first().click();
  await page.waitForTimeout(1500);
  const [ts] = await q(`select taking_students from coach_profiles where id=$1`, [coachId]);
  row(ts.taking_students === "waitlist", "taking-students switch persisted to the DB", ts.taking_students);
  const pub = await (await fetch(`${base}/coaches/${slug}`)).text();
  row(pub.includes("Waitlist open"), "public profile shows Waitlist open");

  // ── enquiries ─────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/enquiries`, { waitUntil: "load" }); await settle(page);
  row((await page.locator("[data-enquiry]:visible").count()) === 3, "inbox: three rows");
  const firstBtn = page.locator("[data-enquiry]:visible button[data-status]").first();
  row((await firstBtn.getAttribute("data-status")) === "new", "inbox: first is New");
  await firstBtn.click();
  await page.waitForTimeout(1500);
  row((await firstBtn.getAttribute("data-status")) === "replied", "inbox: tap cycles to Replied");
  const [e1] = await q(`select status from enquiries where coach_id=$1 and rider_name='Megan Hartley'`, [coachId]);
  row(e1.status === "replied", "inbox: status persisted");
  row((await page.locator("[data-enquiry]:visible a[href^='mailto:']").count()) >= 1 && (await page.locator("[data-enquiry]:visible a[href^='tel:']").count()) >= 1, "inbox: mailto for email, tel for mobile");

  // ── profile ───────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/profile`, { waitUntil: "load" }); await settle(page);
  row(/Preview as a rider/.test(await page.locator("main").innerText()), "profile: preview link");
  await page.locator("input[name=travel_radius_km]").fill("60");
  await page.locator("input[name=years_coaching]").fill("7");
  await page.locator("input[name=contact_email]").fill("isabella@example.com");
  const emailSwitch = page.locator("input[name=show_contact_email]");
  await emailSwitch.check({ force: true });
  await page.locator("#profile-form button[type=submit]").click();
  await page.waitForTimeout(3000);
  const [cp] = await q(`select travel_radius_km, years_coaching, travels_to_rider, show_contact_email, contact_email from coach_profiles where id=$1`, [coachId]);
  row(cp.travel_radius_km === 60 && cp.years_coaching === 7 && cp.travels_to_rider === true && cp.show_contact_email === true, "profile: radius / years / email switch round-trip", JSON.stringify(cp));

  // ── clinics ───────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/clinics`, { waitUntil: "load" }); await settle(page);
  const ct = await page.locator("main").innerText();
  row(/Test Riding Day/.test(ct) && /6 places left/.test(ct) && /0 riders emailed/.test(ct), "clinics: card shows places + riders emailed");
  row(/Every clinic gets its own page/.test(ct), "clinics: Spotlight note");
  row((await page.locator("#new-clinic").count()) === 1, "clinics: new-clinic form present on Spotlight");

  // ── billing ───────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/billing`, { waitUntil: "load" }); await settle(page);
  row((await page.locator("[data-plan-card] p.font-display").innerText()) === "Spotlight", "billing: plan card shows Spotlight");
  row((await page.locator("button[data-plan=spotlight][aria-current=true]").count()) === 1, "billing: current plan marked");
  await page.locator("button[data-plan=listed]").click();
  await page.waitForTimeout(3000);
  const [after] = await q(`select subscription_tier::text as t from coach_profiles where id=$1`, [coachId]);
  row(after.t === "listed", "billing: change plan → Listed written (mock)", after.t);
  row(/Plan changed/.test(await page.locator("main").innerText()), "billing: confirmation shown");
  await page.goto(`${base}/dashboard/clinics`, { waitUntil: "load" }); await settle(page);
  const ct2 = await page.locator("main").innerText();
  row(/one live clinic at a time/.test(ct2) && (await page.locator("#new-clinic").count()) === 0, "clinics: Listed with one upcoming clinic is at its cap (form hidden)");

  // header dashboard mode
  const hdr = await page.locator("header.site-header").innerText();
  row(/View public profile/.test(hdr) && /Isabella/.test(hdr), "header: dashboard mode (View public profile + first name)");
  row(errs.length === 0, "no page errors", errs.slice(0, 2).join(" | "));
  await page.close();
} finally {
  await browser?.close();
  if (coachId) await service.auth.admin.deleteUser(coachId);
  const left = await q(`select (select count(*) from coach_profiles where id=$1)::int + (select count(*) from enquiries where coach_id=$1)::int + (select count(*) from coach_events where coach_id=$1)::int + (select count(*) from clinics where coach_id=$1)::int as n`, [coachId]);
  row(left[0].n === 0, "cleanup: throwaway rows cascaded away");
  await db.end();
}
console.log(failed ? `\n${failed} FAIL` : "\nall ok");
process.exit(failed ? 1 : 0);
