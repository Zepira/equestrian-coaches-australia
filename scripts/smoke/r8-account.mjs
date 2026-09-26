// R8 rider-account smoke test, re-baselined for the CMS schema (24 Sep 2026:
// providers / subscriptions / provider_terms / events / rider_alerts /
// favourites.provider_id). Two throwaway coaches made through the real
// sign-up trigger and published (Bendigo dressage with an event; Broome
// western with an event) + a throwaway rider who has saved the first coach
// and sent them an enquiry. Logs in through the real form and checks
// /account: greeting, saved card, sent enquiry status, an alert saved through
// the real form (row read back with a geocoded point, the profession and the
// discipline, and an express consent recorded), the alert listed, "Coming up
// near you" showing the matching event and hiding the other, the distance on
// the saved card once an alert gives a place, turning the alert off and on,
// the heart removing the favourite, and the delete-account flow (which also
// deletes the rider). Everything else it made is deleted at the end.
//
//   node scripts/smoke/r8-account.mjs [--base http://localhost:3110]
//
// Changed from the pre-CMS version: rider_preferences (one row, a followed
// discipline array) became rider_alerts (several per rider: place, radius,
// who, optional terms), so the alert is set up with the "Who" select and the
// discipline chips of the new AlertForm, and "Alert saved." replaces "Alerts
// saved". Events link to /events/[id], not /clinics/[id].
// Dropped: "area re-rendered as Suburb STATE postcode" in an always-visible
// area field and "chip stays checked after reload" (the form for an existing
// alert now sits collapsed under "Change"; the saved alert is checked as a
// listed row and in the DB instead).
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
/** Run `act` and wait for the server action's POST to answer, then for the page it lands on. */
const posted = async (page, act) => {
  const resp = page.waitForResponse((r) => r.request().method() === "POST" && r.url().startsWith(base), { timeout: 20000 });
  await act();
  await resp;
  await page.waitForLoadState("load").catch(() => {});
  await settle(page);
};
/** Poll until `fn` is truthy (the RSC refresh can land a moment after the POST). */
const until = async (fn, timeout = 8000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn().catch(() => false)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};

const stamp = Date.now();
const password = "Throwaway-1234!";
const emails = [`r8-coach1-${stamp}@example.com`, `r8-coach2-${stamp}@example.com`, `r8-rider-${stamp}@example.com`];
const users = [];
const providers = [];
const mkUser = async (email, meta) => {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (error) throw error;
  users.push(data.user.id);
  return data.user.id;
};
const place = async (suburb, state) => (await q(`select postcode, lat, long, area_id from postcodes where suburb ilike $1 and state=$2 order by postcode limit 1`, [suburb, state]))[0];

let browser, riderId, coach1;
try {
  // ── seed ────────────────────────────────────────────────────────────────
  const [{ id: coaches, name: coachesName }] = await q(`select id, name from terms where kind='profession' and slug='coaches'`);
  const [{ id: dressage }] = await q(`select id from terms where kind='discipline' and slug='dressage'`);
  const [{ id: western }] = await q(`select id from terms where kind='discipline' and slug='western'`);
  const coach = async (email, name, slug, suburb, state, tier, headline, disciplineId) => {
    const uid = await mkUser(email, { role: "provider", name, profession: "coaches" });
    const [{ provider_id: pid }] = await q(`select provider_id from provider_members where user_id=$1`, [uid]);
    providers.push(pid);
    const at = await place(suburb, state);
    await q(
      `update providers set slug=$2, headline=$3, bio='Bio.', suburb=$4, state=$5, postcode=$6, lat=$7, long=$8, area_id=$9,
         location=st_setsrid(st_makepoint($8,$7),4326)::geography, status='published', submitted_at=now(), published_at=now(), updated_at=now()
       where id=$1`,
      [pid, slug, headline, suburb, state, at.postcode, at.lat, at.long, at.area_id]
    );
    await q(`insert into subscriptions (provider_id, tier, status, stripe_customer_id) values ($1,$2,'active',$3)`, [pid, tier, `mock_${slug}`]);
    await q(`insert into provider_terms (provider_id, term_id, sort_order) values ($1,$2,1)`, [pid, disciplineId]);
    return pid;
  };
  coach1 = await coach(emails[0], "Isabella Fletcher", `r8-isabella-${stamp}`, "Bendigo", "VIC", "spotlight", "Dressage from first flatwork through to competition tests.", dressage);
  const coach2 = await coach(emails[1], "Dale Kimberley", `r8-dale-${stamp}`, "Broome", "WA", "clinic", "Ranch riding up north.", western);
  riderId = await mkUser(emails[2], { role: "rider", name: "Sarah Tan" });
  await q(
    `insert into events (provider_id, profession_id, term_id, title, location_text, start_date, capacity, places_left) values
    ($1,$5,$2,'Test Riding Day','Strathfieldsaye VIC · 9am to 3pm', current_date + 30, 12, 6),
    ($3,$5,$4,'Broome Ranch Weekend','Broome WA', current_date + 40, 10, 10)`,
    [coach1, dressage, coach2, western, coaches]
  );
  // Other published events near Castlemaine (real or parity data) may also be
  // listed, so every "coming up" check looks for these two cards by link.
  const [{ id: ourEvent }] = await q(`select id from events where provider_id=$1`, [coach1]);
  const [{ id: farEvent }] = await q(`select id from events where provider_id=$1`, [coach2]);
  await q(`insert into favourites (rider_id, provider_id) values ($1,$2)`, [riderId, coach1]);
  await q(
    `insert into enquiries (provider_id, profession_id, rider_id, rider_name, rider_contact, want, message, status, created_at)
     values ($1,$3,$2,'Sarah Tan','sarah@example.com','regular','Adult returning rider.','new', now() - interval '3 days')`,
    [coach1, riderId, coaches]
  );

  // ── log in ──────────────────────────────────────────────────────────────
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${base}/login`, { waitUntil: "load" }); await settle(page);
  await page.locator("main input[type=email]").first().fill(emails[2]);
  await page.locator("main input[type=password]").first().fill(password);
  await page.locator("main button[type=submit]").first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  await settle(page);

  await page.goto(`${base}/account`, { waitUntil: "load" }); await settle(page);
  let text = await page.locator("main").innerText();
  row(/Hello, Sarah/.test(text), "greeting uses the first name");
  row((await page.locator("[data-fav]").count()) === 1 && /Isabella Fletcher/.test(text), "saved coach card rendered");
  row((await page.locator("[data-fav-count]").innerText()) === "1 saved", "saved count");
  row((await page.locator(`[data-fav] a[href='/profile/r8-isabella-${stamp}']`).count()) >= 1, "saved card links to /profile/[slug]");
  row(!/· \d+ km/.test(await page.locator("[data-fav]").innerText()), "no distance before an alert gives a place");
  row((await page.locator("[data-sent-row]").count()) === 1 && (await page.locator("[data-sent-row] [data-status]").getAttribute("data-status")) === "new" && /awaiting reply/i.test(await page.locator("[data-sent-row] [data-status]").innerText()), "sent enquiry listed as Awaiting reply");
  const ours = () => page.locator(`[data-clinic][href='/events/${ourEvent}']`).count();
  const far = () => page.locator(`[data-clinic][href='/events/${farEvent}']`).count();
  row((await page.locator("[data-clinic]").count()) === 0 && !/Test Riding Day/.test(text) && !/Broome Ranch/.test(text), "nothing coming up before an alert exists");
  const hdr = await page.locator("header.site-header").innerText();
  row(/Sarah/.test(hdr) && !/Log out/.test(hdr), "header: avatar + name, no Log out on /account");

  // ── alert saved through the real form → row read back ────────────────────
  const form = page.locator("[data-alerts] details[open] form").first();
  const placeInput = form.locator("input:not([type=hidden])").first();
  await placeInput.fill("Castlemaine VIC");
  await placeInput.press("Escape");
  await form.locator("select[name=who]").selectOption(`p:${coaches}`);
  await form.locator("fieldset label", { hasText: "Dressage" }).first().click();
  row(await form.locator("input[name=wants_events]").isChecked(), "alert form: clinics and events ticked by default");
  await posted(page, () => form.locator("button[type=submit]").click());
  await until(async () => new URL(page.url()).searchParams.get("saved") === "1" && (await page.locator("[data-alert]").count()) === 1);
  await until(async () => /Alert saved\./.test(await page.locator("main").innerText()));
  const [alert] = await q(
    `select suburb, postcode, radius_km, profession_ids, term_ids, wants_events, consent_source, unsubscribed_at, st_y(location::geometry) as lat
     from rider_alerts where rider_id=$1`,
    [riderId]
  );
  row(
    alert && alert.suburb?.toLowerCase() === "castlemaine" && alert.lat < -37 && alert.profession_ids.includes(coaches) && alert.term_ids.includes(dressage) && alert.wants_events && alert.consent_source === "account",
    "alert persisted with a geocoded point, the profession and the discipline",
    JSON.stringify(alert)
  );
  const consents = await q(
    `select c.purpose, c.action, c.type from consents c join contacts k on k.id=c.contact_id where lower(k.email)=$1`,
    [emails[2]]
  );
  row(consents.some((c) => c.purpose === "rider_alerts" && c.action === "grant" && c.type === "express"), "express rider_alerts consent recorded", JSON.stringify(consents));
  text = await page.locator("main").innerText();
  row(/Alert saved\./.test(text), "saved confirmation shown");
  const alertRow = await page.locator("[data-alert]").first().innerText().catch(() => "");
  row((await page.locator("[data-alert]").count()) === 1 && alertRow.includes(`${coachesName}: Dressage`) && /Castlemaine \d{4}, within 100 km/.test(alertRow), "alert listed (who, where, radius)", alertRow.replace(/\n/g, " "));

  const favText = await page.locator("[data-fav]").innerText();
  const kmMatch = favText.match(/· (\d+) km/);
  row(kmMatch && Number(kmMatch[1]) > 25 && Number(kmMatch[1]) < 45, "saved card shows distance from the alert's place (Castlemaine→Bendigo ≈ 35 km)", favText.replace(/\n/g, " "));
  const ourCard = await page.locator(`[data-clinic][href='/events/${ourEvent}']`).innerText().catch(() => "");
  row((await ours()) === 1 && /Test Riding Day/.test(ourCard) && /Isabella Fletcher · Strathfieldsaye/.test(ourCard), "coming up: matching event shown (title, coach, place without state or time)", ourCard.replace(/\n/g, " "));
  row((await far()) === 0 && !/Broome Ranch/.test(text), "coming up: non-matching event hidden");

  // turn the alert off, then back on
  await posted(page, () => page.locator("[data-alert] button", { hasText: "Turn off" }).first().click());
  await until(async () => (await page.locator("[data-clinic]").count()) === 0);
  const [off] = await q(`select unsubscribed_at from rider_alerts where rider_id=$1`, [riderId]);
  row(off.unsubscribed_at !== null && (await page.locator("[data-clinic]").count()) === 0 && /· off/.test(await page.locator("[data-alert]").first().innerText()), "turn off: alert paused, nothing coming up");
  await posted(page, () => page.locator("[data-alert] button", { hasText: "Turn back on" }).first().click());
  await until(async () => (await ours()) === 1);
  const [on] = await q(`select unsubscribed_at from rider_alerts where rider_id=$1`, [riderId]);
  row(on.unsubscribed_at === null && (await ours()) === 1, "turn back on: alert live, event back");

  // heart removes the favourite
  await posted(page, () => page.locator("[data-fav] button[type=submit]").click());
  await until(async () => (await page.locator("[data-empty]").count()) === 1);
  const favLeft = await q(`select count(*)::int as n from favourites where rider_id=$1`, [riderId]);
  row(favLeft[0].n === 0, "heart removed the favourite (row gone)");
  row((await page.locator("[data-empty]").count()) === 1, "empty state after removing");

  // ── delete account: wrong word refused, right word deletes ───────────────
  await page.goto(`${base}/account/delete`, { waitUntil: "load" }); await settle(page);
  await page.locator("input[name=confirm]").fill("nope");
  await posted(page, () => page.locator("main form button[type=submit]").click());
  await until(async () => new URL(page.url()).searchParams.get("error") === "confirm" && /Type DELETE exactly/.test(await page.locator("main").innerText()));
  row(/Type DELETE exactly/.test(await page.locator("main").innerText()), "delete: wrong confirmation refused");
  const stillThere = await q(`select count(*)::int as n from profiles where id=$1`, [riderId]);
  row(stillThere[0].n === 1, "delete: user untouched after refusal");
  await page.locator("input[name=confirm]").fill("DELETE");
  await posted(page, () => page.locator("main form button[type=submit]").click());
  await page.waitForURL((u) => !u.pathname.startsWith("/account"), { timeout: 10000 }).catch(() => {});
  const gone = await q(
    `select (select count(*) from profiles where id=$1)::int + (select count(*) from rider_alerts where rider_id=$1)::int
      + (select count(*) from favourites where rider_id=$1)::int as n`,
    [riderId]
  );
  row(gone[0].n === 0, "delete: user, alerts and favourites gone");
  const { data: authUser } = await service.auth.admin.getUserById(riderId);
  row(!authUser?.user, "delete: auth user gone");
  row(new URL(page.url()).pathname === "/", "delete: landed on the homepage", page.url());
  const enqLeft = await q(`select rider_id from enquiries where provider_id=$1`, [coach1]);
  row(enqLeft.length === 1 && enqLeft[0].rider_id === null, "delete: coach keeps the enquiry with rider_id nulled");
  row(errs.length === 0, "no page errors", errs.slice(0, 2).join(" | "));
  await page.close();
} catch (e) {
  row(false, "script error", e.message);
} finally {
  await browser?.close();
  if (providers.length) await q(`delete from providers where id = any($1::uuid[])`, [providers]);
  for (const id of users) await service.auth.admin.deleteUser(id).catch(() => {});
  await q(`delete from contacts where lower(email) = any($1::text[])`, [emails]);
  const [left] = await q(
    `select (select count(*) from profiles where id = any($1::uuid[]))::int + (select count(*) from providers where id = any($2::uuid[]))::int
      + (select count(*) from contacts where lower(email) = any($3::text[]))::int as n`,
    [users, providers, emails]
  );
  row(left.n === 0, "cleanup: throwaway users, providers and contacts gone");
  await db.end();
}
console.log(failed ? `\n${passed} ok, ${failed} FAIL` : `\nall ${passed} ok`);
process.exit(failed ? 1 : 0);
