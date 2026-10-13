// Moves the whole database to a new Supabase project (13 Oct 2026: Tokyo to
// Sydney, because the privacy policy says Sydney). A faithful copy, not the
// rebuild: every table, every login (password hashes included, so people
// sign in as before), every stored file. The source is untouched.
//
//   node scripts/db/move-database.mjs --schema   build the empty structure from supabase/migrations
//   node scripts/db/move-database.mjs --data     copy auth users and every public table (target emptied first)
//   node scripts/db/move-database.mjs --storage  create the buckets and copy every file
//   node scripts/db/move-database.mjs --verify   compare row and file counts, table by table
//
// Source: TOKYO_SUPABASE_URL, TOKYO_SUPABASE_SERVICE_ROLE_KEY, TOKYO_DATABASE_PASSWORD
//   (pooler SOURCE_POOLER_HOST, default Tokyo's).
// Target: the main names, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   DATABASE_PASSWORD (pooler SUPABASE_POOLER_HOST, default Sydney's).
//
// The copy runs with session_replication_role = replica on the target, which
// switches triggers and foreign-key checks off for the session: the sign-up
// trigger would otherwise make a second profile for every copied login, and
// the history triggers would log the copy as edits. Columns are the ones both
// sides have, generated columns left out.
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const side = (url, key, password, host) => ({ url, key, ref: new URL(url).hostname.split(".")[0], password, host });
// After the .env swap (13 Oct 2026) the old project's values live under
// TOKYO_* and the main names are Sydney's.
const SRC = side(env.TOKYO_SUPABASE_URL, env.TOKYO_SUPABASE_SERVICE_ROLE_KEY, env.TOKYO_DATABASE_PASSWORD, env.SOURCE_POOLER_HOST || "aws-0-ap-northeast-1.pooler.supabase.com");
const DST = side(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, env.DATABASE_PASSWORD, env.SUPABASE_POOLER_HOST || "aws-0-ap-southeast-2.pooler.supabase.com");
if (SRC.ref === DST.ref) throw new Error("Source and target are the same project.");

const connect = async (s) => {
  const c = new pg.Client({ connectionString: `postgresql://postgres.${s.ref}:${encodeURIComponent(s.password)}@${s.host}:5432/postgres`, ssl: { rejectUnauthorized: false } });
  await c.connect();
  return c;
};

const mode = process.argv[2];
const src = await connect(SRC);
const dst = await connect(DST);
const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);

// Tables PostGIS owns, which its own install fills.
const SKIP = new Set(["spatial_ref_sys"]);
const AUTH_TABLES = ["users", "identities"];

/** Columns a table has on both sides, generated ones left out. */
async function columns(schema, table) {
  const sql = `select column_name from information_schema.columns
    where table_schema = $1 and table_name = $2 and is_generated = 'NEVER' and coalesce(identity_generation, '') <> 'ALWAYS'
    order by ordinal_position`;
  const [a, b] = await Promise.all([q(src, sql, [schema, table]), q(dst, sql, [schema, table])]);
  const there = new Set(b.map((r) => r.column_name));
  return a.map((r) => r.column_name).filter((c) => there.has(c));
}

async function publicTables(c) {
  return (await q(c, `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`))
    .map((r) => r.table_name)
    .filter((t) => !SKIP.has(t));
}

const ident = (s) => `"${s.replace(/"/g, '""')}"`;

async function copyTable(schema, table) {
  const cols = await columns(schema, table);
  if (!cols.length) return 0;
  const list = cols.map(ident).join(", ");
  const full = `${ident(schema)}.${ident(table)}`;
  let copied = 0;
  for (let offset = 0; ; offset += 2000) {
    const [{ rows }] = await q(src, `select coalesce(json_agg(x), '[]'::json) as rows from (select ${list} from ${full} order by 1 limit 2000 offset ${offset}) x`);
    if (!rows.length) break;
    await dst.query(`insert into ${full} (${list}) select ${list} from json_populate_recordset(null::${full}, $1::json)`, [JSON.stringify(rows)]);
    copied += rows.length;
    if (rows.length < 2000) break;
  }
  return copied;
}

try {
  if (mode === "--schema") {
    const done = await q(dst, `select count(*)::int n from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' and table_name <> 'spatial_ref_sys'`);
    if (done[0].n > 0) throw new Error(`The target already has ${done[0].n} tables in public. This builds an empty project only.`);
    const files = readdirSync(resolve(ROOT, "supabase/migrations")).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
    for (const f of files) {
      await dst.query(readFileSync(resolve(ROOT, "supabase/migrations", f), "utf8"));
      console.log("ran", f);
    }
  } else if (mode === "--data") {
    await dst.query("set session_replication_role = replica");
    const tables = await publicTables(src);
    const targetTables = new Set(await publicTables(dst));
    const missing = tables.filter((t) => !targetTables.has(t));
    if (missing.length) throw new Error(`The target is missing tables: ${missing.join(", ")}. Run --schema first.`);
    // Empty what the migrations seeded, so the copy is exactly the source.
    await dst.query(`truncate ${tables.map((t) => `public.${ident(t)}`).join(", ")} cascade`);
    await dst.query(`delete from auth.identities`);
    await dst.query(`delete from auth.users`);
    for (const t of AUTH_TABLES) console.log(`auth.${t}`.padEnd(32), await copyTable("auth", t));
    for (const t of tables) console.log(`public.${t}`.padEnd(32), await copyTable("public", t));
    // Sequences behind serial and identity columns pick up where the source left off.
    const seqs = await q(dst, `select n.nspname as schema, c.relname as seq, t.relname as tbl, a.attname as col
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      join pg_depend d on d.objid = c.oid and d.deptype in ('a', 'i')
      join pg_class t on t.oid = d.refobjid join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
      where c.relkind = 'S' and n.nspname = 'public'`);
    for (const s of seqs) {
      await dst.query(`select setval('${s.schema}.${ident(s.seq)}', coalesce((select max(${ident(s.col)}) from ${s.schema}.${ident(s.tbl)}), 0) + 1, false)`);
    }
    console.log(`sequences reset: ${seqs.length}`);
    await dst.query("set session_replication_role = origin");
    await dst.query("notify pgrst, 'reload schema'");
  } else if (mode === "--storage") {
    const api = (s) => async (method, path, body, raw) => {
      const res = await fetch(`${s.url}/storage/v1/${path}`, {
        method,
        headers: { Authorization: `Bearer ${s.key}`, apikey: s.key, ...(raw ? { "Content-Type": raw.type, "x-upsert": "true" } : { "Content-Type": "application/json" }) },
        body: raw ? raw.data : body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok && res.status !== 409) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
      return res;
    };
    const from = api(SRC);
    const to = api(DST);
    const buckets = await q(src, `select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id`);
    // Some migrations create their own buckets; those get the source's settings instead.
    const existing = new Set((await q(dst, `select id from storage.buckets`)).map((r) => r.id));
    for (const b of buckets) {
      const config = { id: b.id, name: b.id, public: b.public, file_size_limit: b.file_size_limit ?? undefined, allowed_mime_types: b.allowed_mime_types ?? undefined };
      if (existing.has(b.id)) await to("PUT", `bucket/${b.id}`, config);
      else await to("POST", "bucket", config);
      const objects = await q(src, `select name, metadata->>'mimetype' as type from storage.objects where bucket_id = $1 order by name`, [b.id]);
      for (const o of objects) {
        const path = o.name.split("/").map(encodeURIComponent).join("/");
        const file = await (await from("GET", `object/authenticated/${b.id}/${path}`)).arrayBuffer();
        await to("POST", `object/${b.id}/${path}`, null, { type: o.type || "application/octet-stream", data: file });
      }
      console.log(`bucket ${b.id}`.padEnd(32), `${objects.length} files`);
    }
  } else if (mode === "--verify") {
    const tables = await publicTables(src);
    let bad = 0;
    const check = async (label, sql) => {
      const [[a], [b]] = await Promise.all([q(src, sql), q(dst, sql)]);
      const ok = a.n === b.n;
      if (!ok) bad++;
      console.log(`${ok ? "ok  " : "DIFF"} ${label.padEnd(32)} ${a.n}${ok ? "" : ` vs ${b.n}`}`);
    };
    await check("auth.users", "select count(*)::int n from auth.users");
    await check("auth.identities", "select count(*)::int n from auth.identities");
    for (const t of tables) await check(`public.${t}`, `select count(*)::int n from public.${ident(t)}`);
    await check("storage.buckets", "select count(*)::int n from storage.buckets");
    await check("storage.objects", "select count(*)::int n from storage.objects");
    console.log(bad ? `\n${bad} difference(s)` : "\nevery count matches");
    if (bad) process.exitCode = 1;
  } else {
    console.log("Pass --schema, --data, --storage or --verify (see the top of this file).");
  }
} finally {
  await src.end();
  await dst.end();
}
