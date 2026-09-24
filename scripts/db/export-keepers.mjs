// Stage 0 of the CMS rebuild (docs/cms-build-checklist.md): export what is
// worth keeping before the database is wiped. Writes one JSON file to
// supabase/data/ (gitignored) plus a copy of every stored file.
//   node scripts/db/export-keepers.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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

const stamp = new Date().toISOString().slice(0, 10);
const outDir = resolve(ROOT, "supabase/data", `pre-rebuild-${stamp}`);
mkdirSync(outDir, { recursive: true });

await client.connect();
const q = async (sql) => (await client.query(sql)).rows;
const data = {
  exported_at: new Date().toISOString(),
  settings: await q("select * from settings order by key"),
  settings_history: await q("select * from settings_history order by changed_at"),
  admins: await q("select a.user_id, u.email, p.name from admin_users a join auth.users u on u.id = a.user_id left join profiles p on p.id = a.user_id"),
  users: await q("select u.id, u.email, u.created_at, p.role, p.name from auth.users u left join profiles p on p.id = u.id order by u.created_at"),
  coach_profiles: await q("select * from coach_profiles"),
  coach_terms: await q("select ct.*, t.slug as term_slug, t.kind as term_kind from coach_terms ct join terms t on t.id = ct.term_id"),
  coach_photos: await q("select * from coach_photos order by coach_id, sort_order"),
  testimonials: await q("select * from testimonials"),
  clinics: await q("select * from clinics"),
  terms: await q("select * from terms order by kind, sort_order, name"),
  term_aliases: await q("select * from term_aliases order by term_id, alias"),
  term_suggestions: await q("select * from term_suggestions"),
  term_slug_history: await q("select * from term_slug_history"),
  areas_with_intro: await q("select id, slug, name, intro from areas where intro is not null and intro <> ''"),
  storage_objects: await q("select bucket_id, name, created_at from storage.objects order by bucket_id, name"),
};
await client.end();

// Every stored file (discipline photos, coach photos and videos): the
// buckets are emptied by the rebuild. All three buckets are public read.
let copied = 0;
for (const o of data.storage_objects) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${o.bucket_id}/${o.name}`);
  if (!res.ok) continue;
  mkdirSync(resolve(outDir, o.bucket_id), { recursive: true });
  const file = resolve(outDir, o.bucket_id, o.name.replace(/\//g, "__"));
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  copied++;
}

writeFileSync(resolve(outDir, "export.json"), JSON.stringify(data, null, 1));
const edited = data.terms.filter((t) => t.description || t.image_path || t.seo_title || t.seo_description || t.image_credit);
console.log(`wrote ${outDir}`);
console.log(
  Object.entries(data)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => `${k}: ${v.length}`)
    .join(" | ")
);
console.log(`terms with admin-edited content: ${edited.length} (${edited.map((t) => t.slug).join(", ")})`);
console.log(`stored files copied: ${copied} of ${data.storage_objects.length}`);
