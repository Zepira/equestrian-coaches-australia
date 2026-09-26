// R3 data-layer smoke test, re-baselined for the CMS schema (providers,
// provider_members, provider_terms, provider_events, events, rider_alerts).
// Creates a throwaway provider through the real sign-up trigger (published
// here with the service role, Bendigo, dressage, form on, phone hidden) and a
// throwaway rider with an alert (Bendigo, dressage), plus one event. Then it
// exercises every write/read path: the provider's columns, events capacity,
// events_for_rider / riders_for_event (with and without the Clinic reach),
// view and impression logging with the per-visitor-per-day dedupe, an
// enquiry through the live form, the month's counts, and RLS as anon and as
// the provider. Deletes everything it made. Prints ok/FAIL rows.
//   node scripts/smoke/r3-data-layer.mjs [--base http://localhost:3110]
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
const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3110";
let failed = 0;
let passed = 0;
const row = (ok, label, detail = "") => { if (!ok) failed++; else passed++; console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`); };
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const settle = (p) => p.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

const stamp = Date.now();
const PASSWORD = "Throwaway-1234!";
const coachEmail = `smoke-r3-coach-${stamp}@example.com`;
const riderEmail = `smoke-r3-rider-${stamp}@example.com`;
const slug = `smoke-r3-${stamp}`;
const BENDIGO = "st_setsrid(st_makepoint(144.2786,-36.7642),4326)::geography";
const BUNBURY = "st_setsrid(st_makepoint(115.6414,-33.3271),4326)::geography";

const mkUser = async (email, meta) => {
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: meta });
  if (error) throw error;
  return data.user.id;
};

let coachUserId, riderId, providerId, browser;
try {
  // ── setup: the sign-up trigger makes the provider, membership, profession row ─
  coachUserId = await mkUser(coachEmail, { role: "provider", name: "Rhea Smoketest", profession: "coaches" });
  riderId = await mkUser(riderEmail, { role: "rider", name: "Smoke R3 Rider" });
  await wait(800);
  [{ provider_id: providerId }] = await q(`select provider_id from provider_members where user_id=$1`, [coachUserId]);
  const [{ id: coachesId }] = await q(`select id from terms where kind='profession' and slug='coaches'`);
  const [{ id: dressageId }] = await q(`select id from terms where kind='discipline' and slug='dressage' and parent_id=$1`, [coachesId]);
  const [{ id: arenaId }] = await q(`select id from terms where kind='attribute' and slug='own-arena'`);
  const trig = await q(`select t.slug, pt.sort_order from provider_terms pt join terms t on t.id=pt.term_id where pt.provider_id=$1`, [providerId]);
  row(trig.length === 1 && trig[0].slug === "coaches" && trig[0].sort_order === 0, "sign-up trigger: provider + membership + coaches profession row", JSON.stringify(trig));
  const [contact] = await q(`select count(*)::int n from contacts where lower(email) = any($1)`, [[coachEmail, riderEmail]]);
  row(contact.n === 2, "sign-up trigger: a contacts row per new account", `n=${contact.n}`);

  // Published with the service role, as provider-lifecycle.ts does after review.
  // No contact_email: the enquiry below must not send a real email.
  await q(
    `update providers set slug=$2, headline='R3 headline', bio='R3 bio for a throwaway coach.', suburb='Bendigo', state='VIC', postcode='3550',
       location=${BENDIGO}, lat=-36.7642, long=144.2786, status='published', published_at=now(),
       contact_email='', contact_phone='0412 000 000', show_contact_email=false, show_contact_phone=false, show_contact_form=true,
       availability='waitlist', travel_radius_km=60, years_experience=7
     where id=$1`,
    [providerId, slug]
  );
  await q(`insert into subscriptions (provider_id, tier, status) values ($1, 'clinic', 'active')`, [providerId]);
  await q(`insert into provider_terms (provider_id, term_id, sort_order, detail) values ($1,$2,1,null), ($1,$3,0,'60 × 20 m, all-weather surface')`, [providerId, dressageId, arenaId]);
  const [{ id: eventId }] = await q(
    `insert into events (provider_id, profession_id, term_id, title, location_text, start_date, capacity, places_left)
     values ($1,$2,$3,'R3 test clinic','Bendigo VIC', current_date + 30, 12, 6) returning id`,
    [providerId, coachesId, dressageId]
  );
  const [{ id: alertId }] = await q(
    `insert into rider_alerts (rider_id, suburb, postcode, location, radius_km, profession_ids, term_ids, wants_events)
     values ($1,'Bendigo','3550', ${BENDIGO}, 100, array[$2::uuid], array[$3::uuid], true) returning id`,
    [riderId, coachesId, dressageId]
  );

  // ── columns read back ─────────────────────────────────────────────────
  const [cp] = await q(`select availability, travel_radius_km, years_experience, status from providers where id=$1`, [providerId]);
  row(cp.availability === "waitlist" && cp.travel_radius_km === 60 && cp.years_experience === 7 && cp.status === "published", "providers availability / travel radius / years round-trip", JSON.stringify(cp));
  const [ct] = await q(`select detail from provider_terms where provider_id=$1 and term_id=$2`, [providerId, arenaId]);
  row(ct.detail === "60 × 20 m, all-weather surface", "provider_terms.detail round-trips");
  const [cl] = await q(`select capacity, places_left from events where id=$1`, [eventId]);
  row(cl.capacity === 12 && cl.places_left === 6, "events capacity/places_left round-trip");

  // ── events_for_rider / riders_for_event ───────────────────────────────
  // The database is shared, so other providers' events near Bendigo may match
  // too: judge only this provider's rows.
  const ours = (rows) => rows.filter((r) => r.provider_id === providerId);
  const hit = ours(await q(`select * from events_for_rider($1)`, [riderId]));
  row(hit.length === 1 && hit[0].id === eventId && hit[0].provider_name === "Rhea Smoketest" && hit[0].provider_slug === slug, "events_for_rider returns the matching event", JSON.stringify(hit.map((h) => h.title)));
  const riders = await q(`select * from riders_for_event($1)`, [eventId]);
  const mine = riders.find((r) => r.rider_id === riderId);
  row(Boolean(mine) && mine.alert_id === alertId && mine.email === riderEmail, "riders_for_event finds the rider through their alert", `${riders.length} rider(s)`);

  await q(`update rider_alerts set location=${BUNBURY}, suburb='Bunbury', postcode='6230' where id=$1`, [alertId]);
  const miss = ours(await q(`select * from events_for_rider($1)`, [riderId]));
  row(miss.length === 0, "events_for_rider returns nothing for a rider 2,700 km away");
  const far = await q(`select * from riders_for_event($1)`, [eventId]);
  row(!far.some((r) => r.rider_id === riderId), "riders_for_event leaves the far rider out at their own radius");
  const reach = await q(`select * from riders_for_event($1, 4000)`, [eventId]);
  row(reach.some((r) => r.rider_id === riderId), "riders_for_event reaches them with a Clinic reach of 4,000 km");
  await q(`update rider_alerts set location=${BENDIGO}, term_ids=array[$2::uuid] where id=$1`, [alertId, arenaId]);
  const wrongTerm = ours(await q(`select * from events_for_rider($1)`, [riderId]));
  row(wrongTerm.length === 0, "events_for_rider respects the alert's terms (event is dressage, alert wants another term)");
  await q(`insert into notifications_log (rider_id, kind, event_id, alert_id) values ($1,'event',$2,$3)`, [riderId, eventId, alertId]);
  await q(`update rider_alerts set term_ids='{}' where id=$1`, [alertId]);
  const deduped = await q(`select * from riders_for_event($1)`, [eventId]);
  row(!deduped.some((r) => r.rider_id === riderId), "riders_for_event skips a rider already notified about this event");

  // ── live pages: view logged + deduped; impression; enquiry via the real form ─
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const resp = await page.goto(`${base}/profile/${slug}`, { waitUntil: "load" });
  row(resp?.status() === 200, "profile renders at /profile/[slug]", String(resp?.status()));
  await settle(page);
  await page.reload({ waitUntil: "load" }); await settle(page);
  await wait(800);
  const views = await q(`select count(*)::int as n, count(*) filter (where profession_id=$2)::int as p from provider_events where provider_id=$1 and kind='view'`, [providerId, coachesId]);
  row(views[0].n === 1 && views[0].p === 1, "two page loads → exactly one view row, in the coaches section", `n=${views[0].n}`);

  await page.goto(`${base}/search?location=Bendigo+VIC&d=dressage`, { waitUntil: "load" }); await settle(page);
  await wait(800);
  row((await page.locator(`a[href='/profile/${slug}']`).count()) >= 1, "search for dressage near Bendigo lists the provider");
  const imps = await q(`select count(*)::int as n from provider_events where provider_id=$1 and kind='impression'`, [providerId]);
  row(imps[0].n === 1, "a search that lists the provider → one impression row", `n=${imps[0].n}`);

  await page.goto(`${base}/profile/${slug}`, { waitUntil: "load" }); await settle(page);
  const form = page.locator("aside form:has(input[name=rider_name])");
  row((await form.count()) === 1, "enquiry form present on the live page");
  await form.locator("input[name=rider_name]").fill("Smoke Rider");
  await form.locator("input[name=rider_contact]").fill("smoke-r3-enquirer@example.com");
  await form.locator("textarea[name=message]").fill("Hello from the R3 smoke test.");
  const posted = page.waitForResponse((r) => r.request().method() === "POST", { timeout: 15000 });
  await form.locator("button[type=submit]").click();
  await posted;
  await page.locator("aside [role=status]").waitFor({ timeout: 10000 }).catch(() => {});
  const okMsg = await page.locator("aside [role=status]").innerText().catch(() => "");
  row(/Sent to Rhea/.test(okMsg), "form shows the success message", okMsg);
  const enq = await q(`select rider_name, rider_contact, want, status, message, profession_id from enquiries where provider_id=$1`, [providerId]);
  row(enq.length === 1 && enq[0].status === "new" && enq[0].want === "regular" && enq[0].rider_contact === "smoke-r3-enquirer@example.com" && enq[0].profession_id === coachesId, "enquiries row written with status=new in the coaches section", JSON.stringify(enq[0]));
  row(errs.length === 0, "no page errors", errs.join(" | "));
  await browser.close();
  browser = null;

  // ── this month's counts ───────────────────────────────────────────────
  const [m] = await q(
    `select
       (select count(*) from provider_events where provider_id=$1 and kind='impression' and created_at >= date_trunc('month', now()))::int as impressions,
       (select count(*) from provider_events where provider_id=$1 and kind='view' and created_at >= date_trunc('month', now()))::int as views,
       (select count(*) from enquiries where provider_id=$1 and created_at >= date_trunc('month', now()))::int as enquiries`,
    [providerId]
  );
  row(m.impressions === 1 && m.views === 1 && m.enquiries === 1, "this month's counts = 1 impression / 1 view / 1 enquiry", JSON.stringify(m));

  // ── RLS as anon ───────────────────────────────────────────────────────
  const { data: anonEnq } = await anon.from("enquiries").select("id").eq("provider_id", providerId);
  row((anonEnq ?? []).length === 0, "anon cannot read enquiries");
  const { error: anonIns } = await anon.from("provider_events").insert({ provider_id: providerId, kind: "view" });
  row(Boolean(anonIns), "anon cannot insert provider_events", anonIns?.message);
  const { error: anonEnqIns } = await anon.from("enquiries").insert({ provider_id: providerId, rider_name: "x", rider_contact: "x@x.com", message: "x" });
  row(Boolean(anonEnqIns), "anon cannot insert enquiries", anonEnqIns?.message);
  const { data: anonSubs } = await anon.from("subscriptions").select("id").eq("provider_id", providerId);
  row((anonSubs ?? []).length === 0, "anon cannot read subscriptions");

  // ── the provider under RLS ────────────────────────────────────────────
  const signer = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: session, error: signErr } = await signer.auth.signInWithPassword({ email: coachEmail, password: PASSWORD });
  if (signErr) throw signErr;
  const coachClient = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${session.session.access_token}` } } });
  const { data: inbox } = await coachClient.from("enquiries").select("id, status");
  row((inbox ?? []).length === 1, "provider reads their own enquiry under RLS");
  const { error: updErr } = await coachClient.from("enquiries").update({ status: "replied" }).eq("id", inbox?.[0]?.id);
  const [after] = await q(`select status from enquiries where provider_id=$1`, [providerId]);
  row(!updErr && after.status === "replied", "provider can update their enquiry status under RLS", after.status);
  const { data: evRows } = await coachClient.from("provider_events").select("kind");
  row((evRows ?? []).length === 2, "provider reads their own provider_events", `n=${evRows?.length}`);
  await coachClient.from("providers").update({ status: "hidden", headline: "R3 headline, edited" }).eq("id", providerId);
  const [self] = await q(`select status, headline from providers where id=$1`, [providerId]);
  row(self.status === "published" && self.headline === "R3 headline, edited", "provider edits their row but can't change its status", JSON.stringify(self));
  await signer.auth.signOut().catch(() => {});
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
          + (select count(*) from events where provider_id=$1)::int
          + (select count(*) from rider_alerts where rider_id=$3)::int
          + (select count(*) from notifications_log where rider_id=$3)::int
          + (select count(*) from profiles where id = any($4))::int
          + (select count(*) from contacts where lower(email) = any($5))::int as n`,
    [providerId ?? null, slug, riderId ?? null, [coachUserId, riderId].filter(Boolean), [coachEmail, riderEmail]]
  );
  row(left.n === 0, "cleanup: every throwaway row is gone", `n=${left.n}`);
  await db.end();
}
console.log(failed ? `\n${passed} ok, ${failed} FAIL` : `\nall ok (${passed})`);
process.exit(failed ? 1 : 0);
