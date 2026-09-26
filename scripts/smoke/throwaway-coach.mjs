// Creates (or deletes) seeded throwaway accounts for parity runs that need a
// logged-in dashboard or rider account (the R7 / R8 assertions).
//   node scripts/smoke/throwaway-coach.mjs create       → prints the coach's email:password
//   node scripts/smoke/throwaway-coach.mjs create-rider → the coach + two more coaches
//       with events + a rider (Sarah Tan) who has saved all three, has an alert for
//       Castlemaine following dressage and working equitation, and sent two
//       enquiries. Prints the rider's email:password.
//   node scripts/smoke/throwaway-coach.mjs delete       → removes all of them
//
// Then, for example:
//   node scripts/design-reference/parity-check.mjs /dashboard 1280 docs/design-reference/assertions/r7-dashboard-1280.json --login email:password
//
// Schema since the CMS rebuild (24 Sep 2026): the sign-up trigger
// (handle_new_user) makes the provider, its provider_members owner row, the
// contacts row and the coaches profession row when the auth user is created
// with { role: "provider", profession: "coaches" }. This script then fills in
// that provider over the direct connection (as postgres, so the
// status-protection trigger does not apply), writes the plan to
// `subscriptions`, and seeds provider_events / enquiries / events.
// Only the emails below are ever touched.
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
const service = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const q = async (sql, params = []) => (await db.query(sql, params)).rows;

const EMAIL = "parity-coach@example.com";
const EXTRA = ["parity-coach2@example.com", "parity-coach3@example.com", "parity-rider@example.com"];
const ALL = [EMAIL, ...EXTRA];
const SLUGS = ["parity-isabella", "parity-tom", "parity-priya"];
const PASSWORD = "Throwaway-1234!";

async function ourUsers() {
  const found = [];
  for (let page = 1; ; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    found.push(...data.users.filter((u) => ALL.includes((u.email ?? "").toLowerCase())));
    if (data.users.length < 1000) break;
  }
  return found;
}

/** Everything this script owns: providers (members of our users, or our fixed slugs), the users, their contacts rows. */
async function removeAll() {
  const users = await ourUsers();
  const ids = users.map((u) => u.id);
  const providers = await q(
    `select distinct p.id from providers p left join provider_members m on m.provider_id = p.id
     where m.user_id = any($1::uuid[]) or p.slug = any($2::text[])`,
    [ids, SLUGS]
  );
  // Their photos live in storage under <provider id>/, which no cascade reaches.
  for (const { id } of providers) {
    const { data: files } = await service.storage.from("provider-photos").list(id);
    if (files?.length) await service.storage.from("provider-photos").remove(files.map((f) => `${id}/${f.name}`));
  }
  // provider_members cascades from the user, but the provider row does not.
  if (providers.length) await q(`delete from providers where id = any($1::uuid[])`, [providers.map((p) => p.id)]);
  for (const id of ids) {
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) throw error;
  }
  await q(`delete from contacts where lower(email) = any($1::text[])`, [ALL]);
  return { users: ids.length, providers: providers.length };
}

const place = async (suburb, state) => {
  const [row] = await q(`select postcode, suburb, state, lat, long, area_id from postcodes where suburb ilike $1 and state = $2 order by postcode limit 1`, [suburb, state]);
  if (!row) throw new Error(`No postcode row for ${suburb} ${state}`);
  return row;
};
const termId = async (kind, slug) => {
  const [row] = await q(`select id from terms where kind = $1 and slug = $2`, [kind, slug]);
  if (!row) throw new Error(`No ${kind} term ${slug}`);
  return row.id;
};

async function makeUser(email, meta) {
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: meta });
  if (error) throw error;
  return data.user.id;
}

/** A published coach on a live plan, in the given town, with disciplines in order. */
async function makeCoach({ email, name, slug, town, tier, headline, bio, disciplineIds, extra = {} }) {
  const userId = await makeUser(email, { role: "provider", name, profession: "coaches" });
  const [{ provider_id: providerId } = {}] = await q(`select provider_id from provider_members where user_id = $1`, [userId]);
  if (!providerId) throw new Error(`Sign-up trigger made no provider for ${email}`);
  const at = await place(town.suburb, town.state);
  const cols = {
    slug,
    name,
    headline,
    bio,
    suburb: town.suburb,
    state: at.state,
    postcode: at.postcode,
    lat: at.lat,
    long: at.long,
    area_id: at.area_id,
    status: "published",
    submitted_at: new Date(),
    published_at: new Date(),
    ...extra,
  };
  const keys = Object.keys(cols);
  await q(
    `update providers set ${keys.map((k, i) => `${k} = $${i + 2}`).join(", ")},
       location = st_setsrid(st_makepoint($${keys.length + 2}, $${keys.length + 3}), 4326)::geography, updated_at = now()
     where id = $1`,
    [providerId, ...keys.map((k) => cols[k]), at.long, at.lat]
  );
  await q(
    `insert into subscriptions (provider_id, tier, status, founding, stripe_customer_id) values ($1, $2, 'active', true, $3)
     on conflict (provider_id) do update set tier = excluded.tier, status = 'active'`,
    [providerId, tier, `mock_${slug}`]
  );
  for (const [i, id] of disciplineIds.entries()) await q(`insert into provider_terms (provider_id, term_id, sort_order) values ($1, $2, $3)`, [providerId, id, i]);
  return { userId, providerId };
}

const mode = process.argv[2];
if (mode === "delete") {
  const n = await removeAll();
  console.log(`deleted ${n.users} users, ${n.providers} providers`);
} else if (mode === "create" || mode === "create-rider") {
  await removeAll();
  const coaches = await termId("profession", "coaches");
  const ids = [];
  for (const s of ["dressage", "working-equitation", "western", "trail-riding", "liberty"]) ids.push(await termId("discipline", s));
  const [dressage, weq, western, trail, liberty] = ids;

  const isabella = await makeCoach({
    email: EMAIL,
    name: "Isabella Fletcher",
    slug: SLUGS[0],
    town: { suburb: "Bendigo", state: "VIC" },
    tier: "spotlight",
    headline: "Dressage from first flatwork through to competition tests.",
    bio: "Isabella has coached around Bendigo for seven years, working mostly with adult riders who want their flatwork to feel less like a fight.",
    disciplineIds: mode === "create-rider" ? [dressage, weq] : [dressage],
    extra: {
      availability: "yes",
      travel_radius_km: 60,
      travels_to_client: true,
      years_experience: 7,
      qualifications: ["EA Level 1 Coach", "Certificate IV in Equine Studies"],
      contact_phone: "0400 111 222",
      show_contact_phone: true,
      show_contact_form: true,
    },
  });
  const id = isabella.providerId;

  // What a real profile has, so the profile parity assertions find every
  // block: a photo (a real image, uploaded like a coach's), a skill and two
  // setup attributes (the setup tiles).
  for (const [kind, slug] of [["skill", "confidence-building"], ["attribute", "own-arena"], ["attribute", "horses-available"]]) {
    await q(`insert into provider_terms (provider_id, term_id, sort_order) values ($1, $2, 0) on conflict do nothing`, [id, await termId(kind, slug)]);
  }
  const photo = readFileSync(resolve(ROOT, "public/hero/for-coaches-1280.jpg"));
  const { error: upErr } = await service.storage.from("provider-photos").upload(`${id}/parity.jpg`, photo, { contentType: "image/jpeg", upsert: true });
  if (upErr) throw upErr;
  await q(`insert into provider_photos (provider_id, storage_path, sort_order) values ($1, $2, 0)`, [id, `${id}/parity.jpg`]);

  // This month: 412 impressions, 38 views, 9 reveals (distinct visitor hashes, so the dedupe index keeps them all).
  const ev = [];
  for (let i = 0; i < 412; i++) ev.push(`($1,$2,'impression','i${i}', now())`);
  for (let i = 0; i < 38; i++) ev.push(`($1,$2,'view','v${i}', now())`);
  for (let i = 0; i < 9; i++) ev.push(`($1,$2,'reveal','r${i}', now())`);
  await q(`insert into provider_events (provider_id, profession_id, kind, visitor_hash, created_at) values ${ev.join(",")}`, [id, coaches]);
  await q(
    `insert into enquiries (provider_id, profession_id, rider_name, rider_contact, want, message, status, created_at) values
    ($1,$2,'Megan Hartley','megan@example.com','regular','Adult returning rider, 12yo TB gelding who rushes in canter. Weekday afternoons if possible.','new', now() - interval '2 days'),
    ($1,$2,'Cara & Lily Nguyen','0400 222 333','regular','My daughter is 11 and wants to move up from Preliminary. Can you take on a junior?','new', now() - interval '5 days'),
    ($1,$2,'Josh Whitfield','josh@example.com','one_off','Would love a test-riding session before the Kyneton comp on the 4th.','replied', now() - interval '8 days'),
    ($1,$2,'Anne-Marie Roux','anne@example.com','clinic','Is the October test-riding day open to Elementary riders?','no_response', now() - interval '21 days')`,
    [id, coaches]
  );
  await q(
    `insert into events (provider_id, profession_id, term_id, title, location_text, start_date, capacity, places_left)
     values ($1,$2,$3,'Test Riding Day: Preliminary to Elementary','Strathfieldsaye VIC · 9am to 3pm', current_date + 30, 12, 6)`,
    [id, coaches, dressage]
  );

  if (mode === "create-rider") {
    const tom = await makeCoach({
      email: EXTRA[0],
      name: "Tom Reilly",
      slug: SLUGS[1],
      town: { suburb: "Maldon", state: "VIC" },
      tier: "clinic",
      headline: "Ranch riding and quiet, confident trail horses.",
      bio: "Bio.",
      disciplineIds: [western, trail],
    });
    const priya = await makeCoach({
      email: EXTRA[1],
      name: "Priya Nair",
      slug: SLUGS[2],
      town: { suburb: "Kyneton", state: "VIC" },
      tier: "listed",
      headline: "Liberty and groundwork for horses that have stopped listening.",
      bio: "Bio.",
      disciplineIds: [liberty],
    });
    const rider = await makeUser(EXTRA[2], { role: "rider", name: "Sarah Tan" });
    await q(
      `insert into events (provider_id, profession_id, term_id, title, location_text, start_date, capacity, places_left)
       values ($1,$2,$3,'Confident Trail Clinic','Maldon VIC', current_date + 52, 8, 8)`,
      [tom.providerId, coaches, trail]
    );
    await q(
      `insert into favourites (rider_id, provider_id, created_at) values ($1,$2, now()-interval '3 days'),($1,$3, now()-interval '2 days'),($1,$4, now()-interval '1 day')`,
      [rider, priya.providerId, tom.providerId, id]
    );
    const castlemaine = await place("Castlemaine", "VIC");
    await q(
      `insert into rider_alerts (rider_id, suburb, postcode, location, radius_km, profession_ids, term_ids, wants_events, consent_source)
       values ($1,'Castlemaine',$2, st_setsrid(st_makepoint($3,$4),4326)::geography, 100, array[$5]::uuid[], array[$6,$7]::uuid[], true, 'account')`,
      [rider, castlemaine.postcode, castlemaine.long, castlemaine.lat, coaches, dressage, weq]
    );
    await q(
      `insert into enquiries (provider_id, profession_id, rider_id, rider_name, rider_contact, want, message, status, created_at) values
      ($1,$4,$2,'Sarah Tan','sarah@example.com','regular','Adult returning rider, 12yo TB gelding.','replied', now() - interval '12 days'),
      ($3,$4,$2,'Sarah Tan','sarah@example.com','one_off','Could we do a groundwork session first?','new', now() - interval '20 days')`,
      [id, rider, priya.providerId, coaches]
    );
    console.log(`${EXTRA[2]}:${PASSWORD}`);
  } else {
    console.log(`${EMAIL}:${PASSWORD}`);
  }
} else {
  console.error("usage: node scripts/smoke/throwaway-coach.mjs create | create-rider | delete");
  process.exitCode = 1;
}
await db.end();
