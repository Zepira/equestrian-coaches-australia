// Two lasting test accounts for trying the site by hand (12 Oct 2026), unlike
// throwaway-coach.mjs whose accounts are made and deleted around a parity run.
//   node scripts/smoke/test-accounts.mjs create   → makes any that don't exist
//   node scripts/smoke/test-accounts.mjs reset    → deletes them and makes them fresh
//   node scripts/smoke/test-accounts.mjs delete   → removes them
//
// Credentials go into .env (git-ignored) as TEST_PROVIDER_EMAIL /
// TEST_PROVIDER_PASSWORD and TEST_RIDER_EMAIL / TEST_RIDER_PASSWORD, never
// into the repo. The addresses are delivered+…@resend.dev so the real
// emails Supabase and the site send are accepted rather than bounced.
//
// The professional is a coach in Bendigo on an active Spotlight plan (video
// and ten photos switched on), with a discipline, but NOT published: one
// published coach would hide every sample coach on the test site
// (src/lib/samples.ts). Finish onboarding to send it for review; reset puts
// it back. One database serves both localhost and the test host, so these
// accounts work on both.
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const ENV_PATH = resolve(ROOT, ".env");
const envText = readFileSync(ENV_PATH, "utf8");
const env = Object.fromEntries(
  envText.split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const db = new pg.Client({ connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(env.DATABASE_PASSWORD)}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`, ssl: { rejectUnauthorized: false } });
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const q = async (sql, params = []) => (await db.query(sql, params)).rows;

const ACCOUNTS = {
  provider: { email: "delivered+epa-test-coach@resend.dev", envPrefix: "TEST_PROVIDER", meta: { role: "provider", name: "Tess Coachman", profession: "coaches" } },
  rider: { email: "delivered+epa-test-rider@resend.dev", envPrefix: "TEST_RIDER", meta: { role: "rider", name: "Riley Rider" } },
};

async function findUser(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x) => (x.email ?? "").toLowerCase() === email);
    if (u) return u;
    if (data.users.length < 1000) return null;
  }
}

/** Sets KEY=value in .env, replacing the line if it's there. */
function saveEnv(values) {
  let text = readFileSync(ENV_PATH, "utf8");
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : `${text.replace(/\s*$/, "")}\n${line}\n`;
  }
  writeFileSync(ENV_PATH, text);
}

async function remove(account) {
  const user = await findUser(account.email);
  if (!user) return false;
  const providers = await q(`select provider_id from provider_members where user_id = $1`, [user.id]);
  for (const { provider_id: id } of providers) {
    const { data: files } = await service.storage.from("provider-photos").list(id);
    if (files?.length) await service.storage.from("provider-photos").remove(files.map((f) => `${id}/${f.name}`));
    await q(`delete from providers where id = $1`, [id]);
  }
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) throw error;
  await q(`delete from contacts where lower(email) = $1`, [account.email]);
  return true;
}

async function create(account) {
  if (await findUser(account.email)) return null;
  const password = `Epa-${randomBytes(9).toString("base64url")}`;
  const { data, error } = await service.auth.admin.createUser({ email: account.email, password, email_confirm: true, user_metadata: account.meta });
  if (error) throw error;
  saveEnv({ [`${account.envPrefix}_EMAIL`]: account.email, [`${account.envPrefix}_PASSWORD`]: password });
  return data.user.id;
}

async function setUpProvider(userId) {
  const [{ provider_id: id } = {}] = await q(`select provider_id from provider_members where user_id = $1`, [userId]);
  if (!id) throw new Error("The sign-up trigger made no provider.");
  const [at] = await q(`select postcode, suburb, state, lat, long, area_id from postcodes where suburb ilike 'Bendigo' and state = 'VIC' order by postcode limit 1`);
  await q(
    `update providers set headline = $2, suburb = 'Bendigo', state = $3, postcode = $4, lat = $5, long = $6, area_id = $7,
       location = st_setsrid(st_makepoint($6, $5), 4326)::geography, travel_radius_km = 40, updated_at = now()
     where id = $1`,
    [id, "Test account. Not a real coach.", at.state, at.postcode, at.lat, at.long, at.area_id]
  );
  await q(
    `insert into subscriptions (provider_id, tier, status, founding, stripe_customer_id) values ($1, 'spotlight', 'active', true, 'mock_epa_test_coach')
     on conflict (provider_id) do update set tier = 'spotlight', status = 'active'`,
    [id]
  );
  const [dressage] = await q(`select id from terms where kind = 'discipline' and slug = 'dressage'`);
  if (dressage) await q(`insert into provider_terms (provider_id, term_id, sort_order) values ($1, $2, 1) on conflict do nothing`, [id, dressage.id]);
  return id;
}

const mode = process.argv[2];
if (!["create", "reset", "delete"].includes(mode)) {
  console.log("Usage: node scripts/smoke/test-accounts.mjs create | reset | delete");
  process.exit(1);
}
await db.connect();
try {
  for (const [kind, account] of Object.entries(ACCOUNTS)) {
    if (mode !== "create") console.log(kind.padEnd(9), (await remove(account)) ? "removed" : "wasn't there");
    if (mode === "delete") continue;
    const userId = await create(account);
    if (!userId) {
      console.log(kind.padEnd(9), "already exists:", account.email, `(password in .env as ${account.envPrefix}_PASSWORD)`);
      continue;
    }
    if (kind === "provider") await setUpProvider(userId);
    console.log(kind.padEnd(9), "made:", account.email, `(password saved to .env as ${account.envPrefix}_PASSWORD)`);
  }
} finally {
  await db.end();
}
