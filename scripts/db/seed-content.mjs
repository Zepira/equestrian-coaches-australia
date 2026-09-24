// Seeds the CMS rows stage 2 reads (docs/cms-build-checklist.md):
//   - one content_blocks row per key in src/lib/cms/content-defaults.ts
//   - the `plans` and `plan_capabilities` settings from src/lib/tiers.ts
// Only missing rows are written (not "on conflict do nothing": the history
// triggers fire before the conflict check and would log a change that
// never happened), so it never overwrites an admin's edit and is safe to
// run again. The site works without these rows (every reader
// falls back to the same code defaults); seeding makes them visible and
// editable in admin, and gives each one a history starting point.
//
//   node --experimental-strip-types scripts/db/seed-content.mjs
//
// Needs `pg` (a devDependency) and DATABASE_PASSWORD in .env; same pooler
// connection as run-migration.mjs.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { CONTENT_DEFAULTS } from "../../src/lib/cms/content-defaults.ts";
import { DEFAULT_CAPABILITIES, DEFAULT_PLANS, TIERS, capabilityJson } from "../../src/lib/tiers.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const client = new pg.Client({
  connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(env.DATABASE_PASSWORD)}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

const settings = {
  plans: JSON.stringify(DEFAULT_PLANS),
  plan_capabilities: JSON.stringify(
    Object.fromEntries(TIERS.map((t) => [t, capabilityJson(DEFAULT_CAPABILITIES[t])]))
  ),
};

await client.connect();
try {
  for (const [key, value] of Object.entries(CONTENT_DEFAULTS)) {
    const r = await client.query(
      `insert into public.content_blocks (key, value)
       select $1, $2::jsonb where not exists (select 1 from public.content_blocks where key = $1)`,
      [key, JSON.stringify(value)]
    );
    console.log(r.rowCount ? "added  " : "kept   ", "content", key);
  }
  for (const [key, value] of Object.entries(settings)) {
    const r = await client.query(
      `insert into public.settings (key, value)
       select $1, $2 where not exists (select 1 from public.settings where key = $1)`,
      [key, value]
    );
    console.log(r.rowCount ? "added  " : "kept   ", "setting", key);
  }
} finally {
  await client.end();
}
