// One-off loader for the `postcodes` table — see build plan phase 4 and
// CLAUDE.md's "Running Supabase migrations" section for the connection
// approach (session pooler, region brute-forced once per project).
//
// Usage:
//   npm install --no-save pg csv-parse
//   DATABASE_PASSWORD=... node supabase/scripts/load-postcodes.mjs
//
// Source CSV: supabase/data/australian_postcodes.csv — not committed
// (see .gitignore), re-download from:
//   https://raw.githubusercontent.com/matthewproctor/australianpostcodes/master/australian_postcodes.csv
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { Client } from "pg";

const ref = "hpvzjdrfnlkteuldnhyi";
const region = "ap-northeast-1"; // this project's pooler region (see CLAUDE.md)
const password = process.env.DATABASE_PASSWORD;
if (!password) throw new Error("DATABASE_PASSWORD not set");

const conn = `postgresql://postgres.${ref}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres`;

const csv = readFileSync("supabase/data/australian_postcodes.csv", "utf-8");
const rows = parse(csv, { columns: true });

// Dedupe on (postcode, suburb) — the CSV has multiple rows per suburb for
// different statistical-area codes we don't need, all sharing the same
// postcode/locality/lat/long.
const seen = new Set();
const clean = [];
for (const row of rows) {
  const postcode = row.postcode?.trim();
  const suburb = row.locality?.trim();
  const state = row.state?.trim();
  const lat = parseFloat(row.lat);
  const long = parseFloat(row.long);
  if (!postcode || !suburb || !state || Number.isNaN(lat) || Number.isNaN(long)) continue;

  const key = `${postcode}|${suburb}`;
  if (seen.has(key)) continue;
  seen.add(key);
  clean.push({ postcode, suburb, state, lat, long });
}

console.log(`Loading ${clean.length} postcode/suburb rows (of ${rows.length} raw CSV rows)...`);

const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await client.connect();

await client.query("truncate table public.postcodes");

const batchSize = 500;
for (let i = 0; i < clean.length; i += batchSize) {
  const batch = clean.slice(i, i + batchSize);
  const values = [];
  const params = [];
  batch.forEach((row, idx) => {
    const base = idx * 5;
    values.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, ST_SetSRID(ST_MakePoint($${base + 4}, $${base + 5}), 4326)::geography)`
    );
    params.push(row.postcode, row.suburb, row.state, row.long, row.lat);
  });
  await client.query(
    `insert into public.postcodes (postcode, suburb, state, location) values ${values.join(", ")}
     on conflict (postcode, suburb) do nothing`,
    params
  );
  process.stdout.write(`\r${Math.min(i + batchSize, clean.length)}/${clean.length}`);
}
console.log("\nDone.");

const { rows: count } = await client.query("select count(*) from public.postcodes");
console.log(`postcodes table now has ${count[0].count} rows`);

await client.end();
