// Creates (or deletes) a seeded throwaway coach for parity runs that need a
// logged-in dashboard — the R7 dashboard assertions, for example.
//   node scripts/smoke/throwaway-coach.mjs create   → prints email:password
//   node scripts/smoke/throwaway-coach.mjs delete   → removes it (by email prefix)
//   node scripts/smoke/throwaway-coach.mjs create-rider → the coach + two more
//       coaches with clinics + a rider (Sarah) who has saved all three, follows
//       dressage + working equitation from Castlemaine, and sent two enquiries.
//       Prints the rider's email:password for `parity-check.mjs account --login`.
//   node scripts/smoke/throwaway-coach.mjs delete   → removes all of them
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

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
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const EMAIL = "parity-coach@example.com";
const EXTRA = ["parity-coach2@example.com", "parity-coach3@example.com", "parity-rider@example.com"];
const PASSWORD = "Throwaway-1234!";

const mode = process.argv[2];
if (mode === "delete") {
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users.filter((u) => u.email === EMAIL || EXTRA.includes(u.email))) await service.auth.admin.deleteUser(u.id);
  console.log("deleted");
} else {
  const { data: existing } = await service.auth.admin.listUsers({ perPage: 1000 });
  for (const u of existing.users.filter((u) => u.email === EMAIL || EXTRA.includes(u.email))) await service.auth.admin.deleteUser(u.id);
  const { data, error } = await service.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { role: "coach", name: "Isabella Fletcher" } });
  if (error) throw error;
  const id = data.user.id;
  await new Promise((r) => setTimeout(r, 800));
  const [{ id: dressageId }] = await q(`select id from terms where kind='discipline' and slug='dressage'`);
  await q(
    `insert into coach_profiles (id, slug, headline, bio, suburb, state, postcode, location, lat, long, published, subscription_status, subscription_tier, stripe_customer_id, taking_students, travel_radius_km, years_coaching)
     values ($1,'parity-isabella','Dressage from first flatwork through to competition tests.','Isabella has coached around Bendigo for seven years, working mostly with adult riders who want their flatwork to feel less like a fight.','Bendigo','VIC','3550', st_setsrid(st_makepoint(144.2786,-36.7642),4326)::geography, -36.7642, 144.2786, true, 'active', 'spotlight', 'mock_parity', 'yes', 60, 7)`,
    [id]
  );
  await q(`insert into coach_terms (coach_id, term_id, sort_order) values ($1,$2,0)`, [id, dressageId]);
  const ev = [];
  for (let i = 0; i < 412; i++) ev.push(`($1,'impression','i${i}', now())`);
  for (let i = 0; i < 38; i++) ev.push(`($1,'view','v${i}', now())`);
  for (let i = 0; i < 9; i++) ev.push(`($1,'reveal','r${i}', now())`);
  await q(`insert into coach_events (coach_id, kind, visitor_hash, created_at) values ${ev.join(",")}`, [id]);
  await q(`insert into enquiries (coach_id, rider_name, rider_contact, want, message, status, created_at) values
    ($1,'Megan Hartley','megan@example.com','regular','Adult returning rider, 12yo TB gelding who rushes in canter. Weekday afternoons if possible.','new', now() - interval '2 days'),
    ($1,'Cara & Lily Nguyen','0400 222 333','regular','My daughter is 11 and wants to move up from Preliminary — can you take on a junior?','new', now() - interval '5 days'),
    ($1,'Josh Whitfield','josh@example.com','one_off','Would love a test-riding session before the Kyneton comp on the 4th.','replied', now() - interval '8 days'),
    ($1,'Anne-Marie Roux','anne@example.com','clinic','Is the October test-riding day open to Elementary riders?','no_response', now() - interval '21 days')`, [id]);
  await q(`insert into clinics (coach_id, title, discipline_id, location_text, start_date, capacity, places_left) values ($1,'Test Riding Day — Preliminary to Elementary',$2,'Strathfieldsaye VIC · 9am–3pm', current_date + 30, 12, 6)`, [id, dressageId]);
  if (mode === "create-rider") {
    const mk = async (email, meta) => {
      const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: meta });
      if (error) throw error;
      return data.user.id;
    };
    const tom = await mk(EXTRA[0], { role: "coach", name: "Tom Reilly" });
    const priya = await mk(EXTRA[1], { role: "coach", name: "Priya Nair" });
    const rider = await mk(EXTRA[2], { role: "rider", name: "Sarah Tan" });
    await new Promise((r) => setTimeout(r, 900));
    const term = async (slug) => (await q(`select id from terms where kind='discipline' and slug=$1`, [slug]))[0].id;
    const [western, trail, liberty, weq] = await Promise.all(["western", "trail-riding", "liberty", "working-equitation"].map(term));
    await q(
      `insert into coach_profiles (id, slug, headline, bio, suburb, state, postcode, location, lat, long, published, subscription_status, subscription_tier, stripe_customer_id)
       values ($1,'parity-tom','Ranch riding and quiet, confident trail horses.','Bio.','Maldon','VIC','3463', st_setsrid(st_makepoint(144.0667,-36.9967),4326)::geography, -36.9967, 144.0667, true, 'active', 'clinic', 'mock_p2'),
              ($2,'parity-priya','Liberty and groundwork for horses that have stopped listening.','Bio.','Kyneton','VIC','3444', st_setsrid(st_makepoint(144.4533,-37.2444),4326)::geography, -37.2444, 144.4533, true, 'active', 'listed', 'mock_p3')`,
      [tom, priya]
    );
    await q(`insert into coach_terms (coach_id, term_id, sort_order) values ($1,$2,0),($1,$3,1),($4,$5,0),($6,$7,1)`, [tom, western, trail, priya, liberty, id, weq]);
    await q(`insert into clinics (coach_id, title, discipline_id, location_text, start_date, capacity, places_left) values ($1,'Confident Trail Clinic',$2,'Maldon VIC', current_date + 52, 8, 8)`, [tom, trail]);
    await q(`insert into favourites (rider_id, coach_id, created_at) values ($1,$2, now()-interval '3 days'),($1,$3, now()-interval '2 days'),($1,$4, now()-interval '1 day')`, [rider, priya, tom, id]);
    await q(`insert into rider_preferences (rider_id, suburb, postcode, location, followed_discipline_ids) values ($1,'Castlemaine','3450', st_setsrid(st_makepoint(144.2167,-37.0667),4326)::geography, array[$2,$3]::uuid[])`, [rider, dressageId, weq]);
    await q(`insert into enquiries (coach_id, rider_id, rider_name, rider_contact, want, message, status, created_at) values
      ($1,$2,'Sarah Tan','sarah@example.com','regular','Adult returning rider, 12yo TB gelding.','replied', now() - interval '12 days'),
      ($3,$2,'Sarah Tan','sarah@example.com','one_off','Could we do a groundwork session first?','new', now() - interval '20 days')`, [id, rider, priya]);
    console.log(`${EXTRA[2]}:${PASSWORD}`);
  } else {
    console.log(`${EMAIL}:${PASSWORD}`);
  }
}
await db.end();
