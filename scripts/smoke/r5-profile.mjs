// R5 public-profile smoke test, re-baselined for /profile/[slug] and the CMS
// schema. Creates a throwaway provider through the real sign-up trigger
// (published with the service role; phone ON, form ON, three testimonials,
// one upcoming event with places left) and a throwaway rider, then drives
// the live page at 390 and 1280: sheet open/close/focus/scroll lock,
// click-to-reveal (number absent from HTML, present after click, one
// `reveal` row), enquiries from the sheet and the aside → rows, the view
// logged once, favourite flip as the rider, a closed provider refusing, and
// a sample coach when samples are showing. Deletes everything it made.
//   node scripts/smoke/r5-profile.mjs [--base http://localhost:3110]
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
const db = new pg.Client({
  connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(env.DATABASE_PASSWORD)}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await db.connect();
const service = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY);
const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3110";
let failed = 0;
let passed = 0;
const row = (ok, label, detail = "") => { if (!ok) failed++; else passed++; console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`); };
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const settle = (p) => p.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PHONE = "0412 987 654";
const PASSWORD = "Throwaway-1234!";

const stamp = Date.now();
const coachEmail = `smoke-r5-coach-${stamp}@example.com`;
const riderEmail = `smoke-r5-rider-${stamp}@example.com`;
const slug = `smoke-r5-isabella-${stamp}`;
const mkUser = async (email, meta) => {
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: meta });
  if (error) throw error;
  return data.user.id;
};
// Waits for the server action's POST, not a URL or a timer.
const submit = async (page, button) => {
  const posted = page.waitForResponse((r) => r.request().method() === "POST", { timeout: 15000 });
  await button.click();
  await posted;
};

let coachUserId, riderId, providerId, browser;
try {
  coachUserId = await mkUser(coachEmail, { role: "provider", name: "Isabella Smoketest", profession: "coaches" });
  riderId = await mkUser(riderEmail, { role: "rider", name: "Smoke R5 Rider" });
  await new Promise((r) => setTimeout(r, 800));
  [{ provider_id: providerId }] = await q(`select provider_id from provider_members where user_id=$1`, [coachUserId]);
  const [{ id: coachesId }] = await q(`select id from terms where kind='profession' and slug='coaches'`);
  const term = async (kind, s) => (await q(`select id from terms where kind=$1 and slug=$2`, [kind, s]))[0].id;
  const dressageId = await term("discipline", "dressage");
  const weId = await term("discipline", "working-equitation");
  const arenaId = await term("attribute", "own-arena");
  const horsesId = await term("attribute", "horses-available");
  const lateralId = await term("skill", "lateral-work");
  // No contact_email: enquiries must not send a real email from a test.
  await q(
    `update providers set slug=$2,
       headline='Dressage from first flatwork through to competition tests, patient and precise, on your horse or one of mine.',
       bio='Isabella has coached around Bendigo for seven years, working mostly with adult riders who want their flatwork to feel less like a fight.',
       suburb='Bendigo', state='VIC', postcode='3550', location=st_setsrid(st_makepoint(144.2786,-36.7642),4326)::geography, lat=-36.7642, long=144.2786,
       status='published', published_at=now(), contact_email='', contact_phone=$3, show_contact_email=false, show_contact_phone=true, show_contact_form=true,
       availability='yes', travel_radius_km=60, years_experience=7, qualifications=array['EA Level 1 Coach (Dressage)','EA Dressage Judge, Preliminary to Novice']
     where id=$1`,
    [providerId, slug, PHONE]
  );
  await q(`insert into subscriptions (provider_id, tier, status) values ($1, 'clinic', 'active')`, [providerId]);
  await q(
    `insert into provider_terms (provider_id, term_id, sort_order, detail) values ($1,$2,1,null), ($1,$3,2,null), ($1,$4,0,'60 × 20 m, all-weather surface'), ($1,$5,0,'Two schoolmasters for lessons'), ($1,$6,0,null)`,
    [providerId, dressageId, weId, arenaId, horsesId, lateralId]
  );
  await q(
    `insert into testimonials (provider_id, author_name, quote) values ($1,'Adult rider, Bendigo','She worked out why I had been avoiding canter for a year.'), ($1,'Returning rider, Castlemaine','First coach who explained a half-halt in a way my body understood.'), ($1,'Parent, Heathcote','My daughter went from Preliminary to Novice in a season.')`,
    [providerId]
  );
  const [{ id: eventId }] = await q(
    `insert into events (provider_id, profession_id, term_id, title, location_text, start_date, capacity, places_left) values ($1,$2,$3,'Test Riding Day, Preliminary to Elementary','Strathfieldsaye VIC', current_date + 30, 12, 6) returning id`,
    [providerId, coachesId, dressageId]
  );

  browser = await chromium.launch();
  const url = `${base}/profile/${slug}`;

  // ── HTML never contains the phone number ─────────────────────────────
  const res = await fetch(url);
  const html = await res.text();
  row(res.status === 200, "profile renders at /profile/[slug]", String(res.status));
  row(!html.includes(PHONE) && !html.includes(PHONE.replace(/\s/g, "")), "phone number absent from the server HTML");
  row(html.includes(`/events/${eventId}`), "event card links to /events/[id]");
  const oldPath = await fetch(`${base}/coaches/${slug}`, { redirect: "manual" });
  row([301, 308].includes(oldPath.status) && (oldPath.headers.get("location") ?? "").endsWith(`/profile/${slug}`), "old /coaches/<provider> link redirects to /profile/", `${oldPath.status} → ${oldPath.headers.get("location")}`);
  const eventPage = await fetch(`${base}/events/${eventId}`);
  const eventHtml = await eventPage.text();
  row(eventPage.status === 200 && eventHtml.includes("Test Riding Day"), "event page renders at /events/[id]", String(eventPage.status));
  await wait(500);
  // The fetch above was a view too (a different visitor: node's user agent).
  const [{ n: viewsBefore }] = await q(`select count(*)::int n from provider_events where provider_id=$1 and kind='view'`, [providerId]);
  {
    // Rendered text, not raw HTML: React streams comment nodes between
    // expressions ("travels up to <!-- -->60<!-- --> km").
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(url, { waitUntil: "load" }); await settle(page);
    const text = await page.locator("body").innerText();
    row(text.includes("Taking new students") && text.includes("travels up to 60 km") && text.includes("7 years"), "status pill + where-line rendered");
    // case-insensitive: innerText applies the eyebrow's CSS text-transform
    const lower = text.toLowerCase();
    const bits = ["What Isabella helps with", "From Isabella", "Test Riding Day", "6 places left", "Setup", "Qualifications"];
    row(bits.every((b) => lower.includes(b.toLowerCase())), "skills, setup, qualifications, testimonials and event sections rendered", bits.filter((b) => !lower.includes(b.toLowerCase())).join(" | ") || "");
    await page.reload({ waitUntil: "load" }); await settle(page);
    await page.close();
  }
  await wait(500);
  const views = await q(`select count(*)::int n from provider_events where provider_id=$1 and kind='view'`, [providerId]);
  row(views[0].n === viewsBefore + 1, "two loads from one browser → one more view row (per-visitor per-day dedupe)", `${viewsBefore} → ${views[0].n}`);

  // ── phone: sheet, reveal, enquiry ─────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(url, { waitUntil: "load" }); await settle(page);
    row((await page.locator("header.site-header").evaluate((el) => getComputedStyle(el).display)) === "none", "phone: site header hidden, page bar shown");
    row((await page.locator(".coach-profile > div.absolute a").first().innerText()).includes("Results"), "phone: ← Results bar present");
    const bar = page.locator(".enquiry-bar button");
    row((await bar.innerText()).includes("Enquire with Isabella"), "phone: sticky bar reads Enquire with Isabella");
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(200);
    const bb = await bar.boundingBox();
    row(bb && bb.y + bb.height <= 844 && bb.y > 700, "phone: bar stays at the bottom while scrolled", `y=${Math.round(bb?.y ?? -1)}`);

    await bar.click();
    await page.waitForTimeout(600);
    const dialog = page.locator("[role=dialog]");
    row((await dialog.count()) === 1, "phone: sheet opens");
    row((await dialog.evaluate((el) => getComputedStyle(el).animationName)) === "sheet", "phone: sheet animates with `sheet`");
    row((await page.evaluate(() => document.body.style.overflow)) === "hidden", "phone: body scroll locked");
    row((await page.evaluate(() => document.activeElement?.id)) === "enquiry-sheet-title", "phone: focus moved into the sheet");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    row((await dialog.count()) === 0, "phone: Escape closes the sheet");
    row((await page.evaluate(() => document.body.style.overflow)) === "", "phone: scroll unlocked on close");
    row(await page.evaluate(() => document.activeElement?.closest(".enquiry-bar") != null), "phone: focus returns to the bar");

    // reveal
    const reveal = page.locator("main button", { hasText: "Show phone number" }).first();
    row((await reveal.count()) === 1, "phone: Show phone number button present");
    await submit(page, reveal);
    const tel = page.locator("main a[data-revealed=true]").first();
    await tel.waitFor({ timeout: 10000 }).catch(() => {});
    row((await tel.count()) === 1 && (await tel.innerText()).trim() === PHONE, "phone: number revealed on click", await tel.innerText().catch(() => ""));
    await wait(500);
    const reveals = await q(`select count(*)::int as n, count(*) filter (where profession_id=$2)::int p from provider_events where provider_id=$1 and kind='reveal'`, [providerId, coachesId]);
    row(reveals[0].n === 1 && reveals[0].p === 1, "phone: one reveal event logged, in the coaches section", `n=${reveals[0].n}`);

    // enquiry via sheet
    await bar.click();
    await page.waitForTimeout(500);
    await page.locator("[role=dialog] input[name=rider_name]").fill("Sheet Rider");
    await page.locator("[role=dialog] input[name=rider_contact]").fill("0400 111 222");
    await page.locator("[role=dialog] [role=radio]", { hasText: "Clinic" }).click();
    await page.locator("[role=dialog] textarea").fill("Is the October day open to Elementary riders?");
    await submit(page, page.locator("[role=dialog] button[type=submit]"));
    await page.locator("[role=dialog] [role=status]").waitFor({ timeout: 10000 }).catch(() => {});
    const okMsg = await page.locator("[role=dialog] [role=status]").innerText().catch(() => "");
    row(/Sent to Isabella/.test(okMsg), "phone: sheet shows success", okMsg);
    const e1 = await q(`select want, rider_contact, status, profession_id from enquiries where provider_id=$1 order by created_at`, [providerId]);
    row(e1.length === 1 && e1[0].want === "clinic" && e1[0].rider_contact === "0400 111 222" && e1[0].status === "new" && e1[0].profession_id === coachesId, "phone: enquiry row (want=clinic, mobile contact)", JSON.stringify(e1[0]));
    await page.close();
  }

  // ── desktop: aside enquiry, favourite as a rider ──────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto(url, { waitUntil: "load" }); await settle(page);
    row((await page.locator("header.site-header a", { hasText: "Back to results" }).count()) === 1, "desktop: header carries ← Back to results");
    row((await page.locator("aside h2").innerText()) === "Message Isabella", "desktop: aside heading");
    await page.locator("aside input[name=rider_name]").fill("Aside Rider");
    await page.locator("aside input[name=rider_contact]").fill("smoke-r5-aside@example.com");
    await page.locator("aside textarea").fill("Regular lessons please.");
    await submit(page, page.locator("aside button[type=submit]"));
    await page.locator("aside [role=status]").waitFor({ timeout: 10000 }).catch(() => {});
    row(/Sent to Isabella/.test(await page.locator("aside [role=status]").innerText().catch(() => "")), "desktop: aside shows success");
    const e2 = await q(`select want, rider_contact from enquiries where provider_id=$1 order by created_at`, [providerId]);
    row(e2.length === 2 && e2[1].want === "regular" && e2[1].rider_contact === "smoke-r5-aside@example.com", "desktop: second enquiry row (want=regular)");
    row((await page.locator("aside").evaluate((el) => getComputedStyle(el).position)) === "sticky", "desktop: aside is sticky");
    row((await page.locator("figure:has(blockquote)").count()) === 3, "desktop: three testimonial cards");
    row(errs.length === 0, "desktop: no page errors", errs.join(" | "));

    // favourite as a logged-in rider
    await page.goto(`${base}/login`, { waitUntil: "load" }); await settle(page);
    await page.locator("input[type=email]").first().fill(riderEmail);
    await page.locator("input[type=password]").first().fill(PASSWORD);
    await page.locator("button[type=submit]").first().click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
    await page.goto(url, { waitUntil: "load" }); await settle(page);
    const fav = page.locator("button[aria-pressed]:visible", { hasText: "Save to favourites" }).first();
    await fav.waitFor({ timeout: 8000 }).catch(() => {});
    row((await fav.count()) === 1, "desktop: Save to favourites pill present when logged in");
    await fav.click();
    await page.locator("button[aria-pressed=true]:visible", { hasText: "Saved" }).first().waitFor({ timeout: 10000 }).catch(() => {});
    row((await page.locator("button[aria-pressed=true]:visible").count()) === 1 && (await page.locator("button[aria-pressed=true]:visible").innerText()).includes("Saved"), "desktop: heart flips to Saved without reload");
    await wait(500);
    const favRows = await q(`select count(*)::int as n from favourites where rider_id=$1 and provider_id=$2`, [riderId, providerId]);
    row(favRows[0].n === 1, "favourites row written");
    await page.close();
  }

  // ── closed provider refuses ───────────────────────────────────────────
  await q(`update providers set availability='no' where id=$1`, [providerId]);
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(url, { waitUntil: "load" }); await settle(page);
    const bar = page.locator(".enquiry-bar button");
    row((await bar.innerText()).includes("Not taking students right now") && (await bar.isDisabled()), "closed: bar disabled with the canvas copy");
    row((await page.locator("body").innerText()).includes("Not taking students right now"), "closed: status pill copy");
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(url, { waitUntil: "load" }); await settle(page);
    row(/isn't taking new students/.test(await page.locator("aside").innerText()), "closed: aside explains instead of a form");
    row((await page.locator("aside form:has(input[name=rider_name])").count()) === 0, "closed: no enquiry form on the page");
    await page.close();
  }
  const e3 = await q(`select count(*)::int as n from enquiries where provider_id=$1`, [providerId]);
  row(e3[0].n === 2, "closed: no new enquiry rows");

  // ── unpublished provider is not public ────────────────────────────────
  await q(`update providers set status='hidden' where id=$1`, [providerId]);
  const hiddenRes = await fetch(url);
  row(hiddenRes.status === 404, "hidden provider's profile is a 404", String(hiddenRes.status));
  await q(`update providers set status='published' where id=$1`, [providerId]);

  // ── sample coach (only while samples show: one real coach hides them) ─
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    const r = await page.goto(`${base}/profile/emma-dawson-0`, { waitUntil: "load" }); await settle(page);
    if (r?.status() === 404) {
      row(true, "sample coach: samples are hidden (a real coach is published), profile 404s as intended");
    } else {
      const html2 = await page.content();
      const text2 = await page.locator("body").innerText();
      row(errs.length === 0, "sample coach: no page errors", errs.join(" | "));
      row(/Emma Dawson/.test(text2) && /What Emma helps with/.test(text2) && /Setup/.test(text2), "sample coach: sections render");
      row(!/04\d\d \d\d\d \d\d\d/.test(html2), "sample coach: no phone number in HTML");
    }
    await page.close();
  }
} catch (err) {
  row(false, "script error", err?.stack ?? String(err));
} finally {
  await browser?.close().catch(() => {});
  if (providerId) await q(`delete from providers where id=$1`, [providerId]);
  if (coachUserId) await service.auth.admin.deleteUser(coachUserId);
  if (riderId) await service.auth.admin.deleteUser(riderId);
  await q(`delete from contacts where lower(email) = any($1)`, [[coachEmail, riderEmail]]);
  const [left] = await q(
    `select (select count(*) from providers where id=$1 or slug=$2)::int
          + (select count(*) from enquiries where provider_id=$1)::int
          + (select count(*) from provider_events where provider_id=$1)::int
          + (select count(*) from favourites where provider_id=$1)::int
          + (select count(*) from profiles where id = any($3))::int
          + (select count(*) from contacts where lower(email) = any($4))::int as n`,
    [providerId ?? null, slug, [coachUserId, riderId].filter(Boolean), [coachEmail, riderEmail]]
  );
  row(left.n === 0, "cleanup: every throwaway row is gone", `n=${left.n}`);
  await db.end();
}
console.log(failed ? `\n${passed} ok, ${failed} FAIL` : `\nall ok (${passed})`);
process.exit(failed ? 1 : 0);
