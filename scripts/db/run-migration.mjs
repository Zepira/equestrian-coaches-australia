// Needs `npm install --no-save pg` first (kept out of package.json — the app never uses a raw Postgres driver).
// One-off migration runner (see CLAUDE.md "Running Supabase migrations"):
// session pooler, ap-northeast-1, ssl without CA verification.
//   node run-migration.mjs <sql file>            run a file
//   node run-migration.mjs --query "<sql>"       run an ad-hoc statement
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/^/([A-Za-z]:)/, "$1");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const ref = url.hostname.split(".")[0];
const client = new pg.Client({
  connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(env.DATABASE_PASSWORD)}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const args = process.argv.slice(2);
try {
  if (args[0] === "--query") {
    const r = await client.query(args[1]);
    console.log(JSON.stringify(r.rows ?? r, null, 1));
  } else {
    const sql = readFileSync(resolve(ROOT, args[0]), "utf8");
    await client.query(sql);
    console.log("ran", args[0]);
  }
} finally {
  await client.end();
}
