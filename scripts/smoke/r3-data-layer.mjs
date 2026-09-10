// R3 smoke test. Creates a throwaway coach (published, Bendigo, dressage,
// form on, phone hidden) + a throwaway rider (prefs: Bendigo, follows
// dressage) + a clinic, exercises every new write/read path, then deletes
// both users (cascade cleans the rest). Prints ok/FAIL rows.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/^/([A-Za-z]:)/, "$1");
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
let failed = 0;
const row = (ok, label, detail = "") => { if (!ok) failed++; console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`); };
const q = async (sql, params = []) => (await db.query(sql, params)).rows;

const stamp = Date.now();
const mk = async (email, role, name) => {
  const { data, error } = await service.auth.admin.createUser({ email, password: "Throwaway-1234!", email_confirm: true, user_metadata: { role, name } });
  if (error) throw error;
  return data.user.id;
};

let coachId, riderId;
try {
  coachId = await mk(`r3-coach-${stamp}@example.com`, "coach", "R3 Test Coach");
  riderId = await mk(`r3-rider-${stamp}@example.com`, "rider", "R3 Test Rider");
  await new Promise((r) => setTimeout(r, 800)); // signup trigger → profiles rows
  const [{ id: dressageId }] = await q(`select id from terms where kind='discipline' and slug='dressage'`);
  const [{ id: arenaId }] = await q(`select id from terms where kind='attribute' and slug='own-arena'`);
  const slug = `r3-test-coach-${stamp}`;
  await q(
    `insert into coach_profiles (id, slug, headline, bio, suburb, state, postcode, location, lat, long, published, subscription_status, subscription_tier,
       contact_email, contact_phone, show_contact_email, show_contact_phone, show_contact_form, taking_students, travel_radius_km, years_coaching)
     values ($1,$2,'R3 headline','R3 bio for a throwaway coach.','Bendigo','VIC','3550', st_setsrid(st_makepoint(144.2786,-36.7642),4326)::geography, -36.7642, 144.2786, true, 'active', 'standard_plus_clinics',
       'coach@example.com','0412 000 000', true, false, true, 'waitlist', 60, 7)`,
    [coachId, slug]
  );
  await q(`insert into coach_terms (coach_id, term_id, sort_order, detail) values ($1,$2,0,null), ($1,$3,0,'60 × 20 m, all-weather surface')`, [coachId, dressageId, arenaId]);
  const [{ id: clinicId }] = await q(
    `insert into clinics (coach_id, title, discipline_id, location_text, start_date, capacity, places_left) values ($1,'R3 test clinic',$2,'Bendigo VIC', current_date + 30, 12, 6) returning id`,
    [coachId, dressageId]
  );
  await q(
    `insert into rider_preferences (rider_id, suburb, postcode, location, followed_discipline_ids) values ($1,'Bendigo','3550', st_setsrid(st_makepoint(144.2786,-36.7642),4326)::geography, array[$2::uuid])`,
    [riderId, dressageId]
  );

  // ── new columns read back ─────────────────────────────────────────────
  const [cp] = await q(`select taking_students, travel_radius_km, years_coaching from coach_profiles where id=$1`, [coachId]);
  row(cp.taking_students === "waitlist" && cp.travel_radius_km === 60 && cp.years_coaching === 7, "coach_profiles new columns round-trip", JSON.stringify(cp));
  const [ct] = await q(`select detail from coach_terms where coach_id=$1 and term_id=$2`, [coachId, arenaId]);
  row(ct.detail === "60 × 20 m, all-weather surface", "coach_terms.detail round-trips");
  const [cl] = await q(`select capacity, places_left from clinics where id=$1`, [clinicId]);
  row(cl.capacity === 12 && cl.places_left === 6, "clinics capacity/places_left round-trip");

  // ── clinics_for_rider ─────────────────────────────────────────────────
  const hit = await q(`select * from clinics_for_rider($1)`, [riderId]);
  row(hit.length === 1 && hit[0].id === clinicId && hit[0].coach_name === "R3 Test Coach", "clinics_for_rider returns the matching clinic", JSON.stringify(hit.map((h) => h.title)));
  await q(`update rider_preferences set location = st_setsrid(st_makepoint(115.6414,-33.3271),4326)::geography, followed_discipline_ids='{}' where rider_id=$1`, [riderId]);
  const miss = await q(`select * from clinics_for_rider($1)`, [riderId]);
  row(miss.length === 0, "clinics_for_rider returns nothing for a far rider with no followed disciplines");

  // ── live page: view logged + deduped; enquiry inserted via the real form ─
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://localhost:3000/coaches/${slug}`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await new Promise((r) => setTimeout(r, 800));
  const views = await q(`select count(*)::int as n from coach_events where coach_id=$1 and kind='view'`, [coachId]);
  row(views[0].n === 1, "two page loads → exactly one view row (per-visitor per-day dedupe)", `n=${views[0].n}`);

  await page.goto(`http://localhost:3000/search?location=Bendigo+VIC&d=dressage`, { waitUntil: "networkidle" });
  await new Promise((r) => setTimeout(r, 800));
  const imps = await q(`select count(*)::int as n from coach_events where coach_id=$1 and kind='impression'`, [coachId]);
  row(imps[0].n === 1, "a search that lists the coach → one impression row", `n=${imps[0].n}`);

  await page.goto(`http://localhost:3000/coaches/${slug}`, { waitUntil: "networkidle" });
  const form = page.locator("form:has(input[name=rider_name])");
  row((await form.count()) === 1, "enquiry form present on the live page");
  await form.locator("input[name=rider_name]").fill("Smoke Rider");
  await form.locator("input[name=rider_email], input[name=rider_contact]").first().fill("smoke@example.com");
  await form.locator("textarea[name=message]").fill("Hello from the R3 smoke test.");
  await form.locator("button[type=submit]").click();
  await page.waitForTimeout(2500);
  const bodyText = await page.locator("body").innerText();
  row(/Sent to R3 Test Coach/.test(bodyText), "form shows the success message", bodyText.match(/Sent to[^.]*\./)?.[0] ?? "(none)");
  const enq = await q(`select rider_name, rider_contact, want, status, message from enquiries where coach_id=$1`, [coachId]);
  row(enq.length === 1 && enq[0].status === "new" && enq[0].want === "regular" && enq[0].rider_contact === "smoke@example.com", "enquiries row written with status=new", JSON.stringify(enq[0]));
  await browser.close();

  // ── monthStats via SQL cross-check ────────────────────────────────────
  const [m] = await q(
    `select
       (select count(*) from coach_events where coach_id=$1 and kind='impression' and created_at >= date_trunc('month', now()))::int as impressions,
       (select count(*) from coach_events where coach_id=$1 and kind='view' and created_at >= date_trunc('month', now()))::int as views,
       (select count(*) from enquiries where coach_id=$1 and created_at >= date_trunc('month', now()))::int as enquiries`,
    [coachId]
  );
  row(m.impressions === 1 && m.views === 1 && m.enquiries === 1, "this month's counts = 1 impression / 1 view / 1 enquiry", JSON.stringify(m));

  // ── RLS as anon ───────────────────────────────────────────────────────
  const { data: anonEnq } = await anon.from("enquiries").select("id");
  row((anonEnq ?? []).length === 0, "anon cannot read enquiries");
  const { error: anonIns } = await anon.from("coach_events").insert({ coach_id: coachId, kind: "view" });
  row(Boolean(anonIns), "anon cannot insert coach_events", anonIns?.message);
  const { error: anonEnqIns } = await anon.from("enquiries").insert({ coach_id: coachId, rider_name: "x", rider_contact: "x@x.com", message: "x" });
  row(Boolean(anonEnqIns), "anon cannot insert enquiries", anonEnqIns?.message);

  // coach reads own inbox
  const { data: session } = await anon.auth.signInWithPassword({ email: `r3-coach-${stamp}@example.com`, password: "Throwaway-1234!" });
  const coachClient = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${session.session.access_token}` } } });
  const { data: mine } = await coachClient.from("enquiries").select("id, status");
  row((mine ?? []).length === 1, "coach reads their own enquiry under RLS");
  const { error: updErr } = await coachClient.from("enquiries").update({ status: "replied" }).eq("id", mine[0].id);
  const [after] = await q(`select status from enquiries where id=$1`, [mine[0].id]);
  row(!updErr && after.status === "replied", "coach can update their enquiry status under RLS", after.status);
} finally {
  if (coachId) await service.auth.admin.deleteUser(coachId);
  if (riderId) await service.auth.admin.deleteUser(riderId);
  const left = await q(`select (select count(*) from coach_profiles where id=$1)::int + (select count(*) from enquiries where coach_id=$1)::int + (select count(*) from coach_events where coach_id=$1)::int as n`, [coachId]);
  row(left[0].n === 0, "cleanup: throwaway rows cascaded away");
  await db.end();
}
console.log(failed ? `\n${failed} FAIL` : "\nall ok");
process.exit(failed ? 1 : 0);
