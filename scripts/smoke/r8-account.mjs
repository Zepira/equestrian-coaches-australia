// R8 rider-account smoke test. Two throwaway coaches (Bendigo dressage with
// a clinic; Broome western with a clinic) + a throwaway rider who has saved
// the first coach and sent them an enquiry. Logs in through the real form and
// checks /account: greeting, saved card, sent enquiry status, alerts save
// round-trip (row read back with a geocoded point), "Coming up near you"
// shows the matching clinic and hides the non-matching one, distance on the
// saved card once an area exists, heart removes the favourite, and the
// delete-account flow actually deletes the user (which is also the cleanup).
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
const password = "Throwaway-1234!";
const users = [];
const mkUser = async (email, meta) => {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (error) throw error;
  users.push(data.user.id);
  return data.user.id;
};
let browser, riderId;
try {
  const coach1 = await mkUser(`r8-coach1-${stamp}@example.com`, { role: "coach", name: "Isabella Fletcher" });
  const coach2 = await mkUser(`r8-coach2-${stamp}@example.com`, { role: "coach", name: "Dale Kimberley" });
  riderId = await mkUser(`r8-rider-${stamp}@example.com`, { role: "rider", name: "Sarah Tan" });
  await new Promise((r) => setTimeout(r, 900));
  const [{ id: dressage }] = await q(`select id from terms where kind='discipline' and slug='dressage'`);
  const [{ id: western }] = await q(`select id from terms where kind='discipline' and slug='western'`);
  await q(
    `insert into coach_profiles (id, slug, headline, bio, suburb, state, postcode, location, lat, long, published, subscription_status, subscription_tier, stripe_customer_id)
     values ($1,'r8-isabella-${stamp}','Dressage from first flatwork through to competition tests.','Bio.','Bendigo','VIC','3550', st_setsrid(st_makepoint(144.2786,-36.7642),4326)::geography, -36.7642, 144.2786, true, 'active', 'spotlight', 'mock_x'),
            ($2,'r8-dale-${stamp}','Ranch riding up north.','Bio.','Broome','WA','6725', st_setsrid(st_makepoint(122.2359,-17.9614),4326)::geography, -17.9614, 122.2359, true, 'active', 'clinic', 'mock_y')`,
    [coach1, coach2]
  );
  await q(`insert into coach_terms (coach_id, term_id, sort_order) values ($1,$2,0), ($3,$4,0)`, [coach1, dressage, coach2, western]);
  await q(`insert into clinics (coach_id, title, discipline_id, location_text, start_date, capacity, places_left) values
    ($1,'Test Riding Day',$2,'Strathfieldsaye VIC · 9am–3pm', current_date + 30, 12, 6),
    ($3,'Broome Ranch Weekend',$4,'Broome WA', current_date + 40, 10, 10)`, [coach1, dressage, coach2, western]);
  await q(`insert into favourites (rider_id, coach_id) values ($1,$2)`, [riderId, coach1]);
  await q(`insert into enquiries (coach_id, rider_id, rider_name, rider_contact, want, message, status, created_at) values ($1,$2,'Sarah Tan','sarah@example.com','regular','Adult returning rider.','new', now() - interval '3 days')`, [coach1, riderId]);

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${base}/login`, { waitUntil: "load" }); await settle(page);
  await page.locator("input[type=email], input[name=email]").first().fill(`r8-rider-${stamp}@example.com`);
  await page.locator("input[type=password]").first().fill(password);
  await page.locator("form button[type=submit]").first().click();
  await page.waitForTimeout(3500);

  await page.goto(`${base}/account`, { waitUntil: "load" }); await settle(page);
  let text = await page.locator("main").innerText();
  row(/Hello, Sarah/.test(text), "greeting uses the first name");
  row((await page.locator("[data-fav]").count()) === 1 && /Isabella Fletcher/.test(text), "saved coach card rendered");
  row((await page.locator("[data-fav-count]").innerText()) === "1 saved", "saved count");
  row(!/· \d+ km/.test(await page.locator("[data-fav]").innerText()), "no distance before an area is saved");
  row((await page.locator("[data-sent-row]").count()) === 1 && (await page.locator("[data-sent-row] [data-status]").innerText()) === "AWAITING REPLY", "sent enquiry listed as Awaiting reply");
  row(!/Test Riding Day/.test(text) && !/Broome Ranch/.test(text), "nothing near you before preferences exist");
  const hdr = await page.locator("header.site-header").innerText();
  row(/Sarah/.test(hdr) && !/Log out/.test(hdr), "header: avatar + name, no Log out on /account");

  // alerts save → row read back
  await page.locator("[data-alerts-form] input[type=text], [data-alerts-form] input:not([type=hidden]):not([type=checkbox])").first().fill("Castlemaine VIC");
  await page.locator("[data-follow-chips] label", { hasText: "Dressage" }).first().click();
  await page.locator("[data-alerts-form] button[type=submit]").click();
  await page.waitForTimeout(3000); await settle(page);
  const [pref] = await q(`select suburb, postcode, followed_discipline_ids, st_y(location::geometry) as lat from rider_preferences where rider_id=$1`, [riderId]);
  row(pref && pref.suburb?.toLowerCase() === "castlemaine" && pref.lat < -37 && pref.followed_discipline_ids.includes(dressage), "alerts persisted with geocoded point + followed discipline", JSON.stringify(pref));
  row(/Alerts saved/.test(await page.locator("main").innerText()), "saved confirmation shown");
  const areaVal = await page.locator("[data-alerts-form] input[name=area]").inputValue();
  row(/Castlemaine VIC 3450/.test(areaVal), "area re-rendered as Suburb STATE postcode", areaVal);
  row((await page.locator("[data-follow-chips] input:checked").count()) === 1, "chip stays checked after reload");

  text = await page.locator("main").innerText();
  const favText = await page.locator("[data-fav]").innerText();
  const kmMatch = favText.match(/· (\d+) km/);
  row(kmMatch && Number(kmMatch[1]) > 25 && Number(kmMatch[1]) < 45, "saved card shows distance from the saved area (Castlemaine→Bendigo ≈ 35 km)", favText.replace(/\n/g, " "));
  row((await page.locator("[data-clinic]").count()) === 1 && /Test Riding Day/.test(text) && /Isabella Fletcher · Strathfieldsaye/.test(text), "coming up: matching clinic shown");
  row(!/Broome Ranch/.test(text), "coming up: non-matching clinic hidden");
  const clinicHref = await page.locator("[data-clinic]").getAttribute("href");
  row(/^\/clinics\//.test(clinicHref ?? ""), "clinic card links to its page", clinicHref);

  // heart removes the favourite
  await page.locator("[data-fav] button[type=submit]").click();
  await page.waitForTimeout(2500); await settle(page);
  const favLeft = await q(`select count(*)::int as n from favourites where rider_id=$1`, [riderId]);
  row(favLeft[0].n === 0, "heart removed the favourite (row gone)");
  row((await page.locator("[data-empty]").count()) === 1, "empty state after removing");

  // delete account: wrong word refused, right word deletes
  await page.goto(`${base}/account/delete`, { waitUntil: "load" }); await settle(page);
  await page.locator("input[name=confirm]").fill("nope");
  await page.locator("form button[type=submit]").click();
  await page.waitForTimeout(2500);
  row(/Type DELETE exactly/.test(await page.locator("main").innerText()), "delete: wrong confirmation refused");
  const stillThere = await q(`select count(*)::int as n from profiles where id=$1`, [riderId]);
  row(stillThere[0].n === 1, "delete: user untouched after refusal");
  await page.locator("input[name=confirm]").fill("DELETE");
  await page.locator("form button[type=submit]").click();
  await page.waitForTimeout(4000);
  const gone = await q(`select (select count(*) from profiles where id=$1)::int + (select count(*) from rider_preferences where rider_id=$1)::int as n`, [riderId]);
  row(gone[0].n === 0, "delete: user + preferences gone");
  row(page.url().startsWith(`${base}/`) && !page.url().includes("/account"), "delete: landed on the homepage signed out", page.url());
  const enqLeft = await q(`select rider_id from enquiries where coach_id=$1`, [coach1]);
  row(enqLeft.length === 1 && enqLeft[0].rider_id === null, "delete: coach keeps the enquiry with rider_id nulled");
  row(errs.length === 0, "no page errors", errs.slice(0, 2).join(" | "));
  await page.close();
} finally {
  await browser?.close();
  for (const id of users) await service.auth.admin.deleteUser(id).catch(() => {});
  const left = await q(`select count(*)::int as n from profiles where id = any($1)`, [users]);
  row(left[0].n === 0, "cleanup: throwaway users gone");
  await db.end();
}
console.log(failed ? `\n${failed} FAIL` : "\nall ok");
process.exit(failed ? 1 : 0);
