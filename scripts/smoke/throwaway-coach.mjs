// Creates (or deletes) a seeded throwaway coach for parity runs that need a
// logged-in dashboard — the R7 dashboard assertions, for example.
//   node scripts/smoke/throwaway-coach.mjs create   → prints email:password
//   node scripts/smoke/throwaway-coach.mjs delete   → removes it (by email prefix)
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
const PASSWORD = "Throwaway-1234!";

const mode = process.argv[2];
if (mode === "delete") {
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users.filter((u) => u.email === EMAIL)) await service.auth.admin.deleteUser(u.id);
  console.log("deleted");
} else {
  const { data: existing } = await service.auth.admin.listUsers({ perPage: 1000 });
  for (const u of existing.users.filter((u) => u.email === EMAIL)) await service.auth.admin.deleteUser(u.id);
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
  console.log(`${EMAIL}:${PASSWORD}`);
}
await db.end();
