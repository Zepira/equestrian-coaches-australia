// The full old → new address map, generated from the database (CMS build
// stage 3; CLAUDE.md "Redirect ordering trap": generate it, never write it
// by hand). The site doesn't read this file: the redirects themselves are
// pattern rules in next.config.ts plus redirectMissingTerm in
// src/lib/sections.ts. This is the list for checking them, for Search
// Console, and for a domain move, which needs exactly the same map.
//
//   node scripts/db/redirect-map.mjs > redirect-map.csv
//   node scripts/db/redirect-map.mjs --check http://localhost:3000   (fetch each old URL, report any that don't land on its new one)
//
// Rows, in the order the site resolves them: provider profiles first (an old
// /coaches/<x> is a provider before it is a discipline), then disciplines and
// their renamed slugs, place pages, events, and the horse care holding pages.
import { readFileSync } from "node:fs";
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

const rows = [];
const add = (from, to, why) => rows.push({ from, to, why });

await client.connect();
try {
  const q = async (sql) => (await client.query(sql)).rows;

  for (const p of await q(`select slug from public.providers where status = 'published' order by slug`)) {
    add(`/coaches/${p.slug}`, `/profile/${p.slug}`, "provider profile");
  }

  const coaching = (await q(`select id from public.terms where kind = 'profession' and slug = 'coaches'`))[0]?.id;
  add("/disciplines", "/coaches#disciplines", "disciplines index");
  for (const d of await q(`select slug from public.terms where kind = 'discipline' and parent_id = '${coaching}' and active order by slug`)) {
    add(`/disciplines/${d.slug}`, `/coaches/${d.slug}`, "discipline");
  }
  for (const h of await q(`
    select h.old_slug, t.slug, p.slug as profession
    from public.term_slug_history h join public.terms t on t.id = h.term_id join public.terms p on p.id = t.parent_id
    where h.kind = 'discipline' order by h.old_slug`)) {
    add(`/${h.profession}/${h.old_slug}`, `/${h.profession}/${h.slug}`, "renamed slug");
    if (h.profession === "coaches") add(`/disciplines/${h.old_slug}`, `/coaches/${h.slug}`, "renamed slug, old route");
  }

  for (const r of await q(`
    select p.slug as profession, t.slug as term, a.slug as area
    from public.indexable_pages i
    join public.terms p on p.id = i.profession_id
    left join public.terms t on t.id = i.term_id
    join public.areas a on a.id = i.area_id
    where i.eligible and p.slug = 'coaches' order by a.slug, t.slug`)) {
    if (r.term) add(`/disciplines/${r.term}/${r.area}`, `/coaches/${r.term}/in/${r.area}`, "discipline place page");
    else add(`/riding-instructors/${r.area}`, `/coaches/in/${r.area}`, "place page");
  }

  for (const e of await q(`select id from public.events order by start_date`)) {
    add(`/clinics/${e.id}`, `/events/${e.id}`, "event");
  }

  for (const p of await q(`
    select t.slug from public.terms t join public.profession_details d on d.term_id = t.id
    where t.kind = 'profession' and d.door = 'horse_care' and d.launch_state = 'live' order by t.sort_order`)) {
    add(`/horse-care/${p.slug}`, `/${p.slug}`, "horse care holding page");
  }
} finally {
  await client.end();
}

const checkAt = process.argv.includes("--check") ? process.argv[process.argv.indexOf("--check") + 1] : null;
if (!checkAt) {
  console.log("from,to,why");
  for (const r of rows) console.log(`${r.from},${r.to},${r.why}`);
} else {
  let bad = 0;
  for (const r of rows) {
    const res = await fetch(checkAt + r.from, { redirect: "follow" });
    const landed = new URL(res.url).pathname + (r.to.includes("#") ? "#" + r.to.split("#")[1] : "");
    const want = r.to;
    const ok = res.ok && landed.split("#")[0] === want.split("#")[0];
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${r.from} -> ${landed} (${res.status})${ok ? "" : `  wanted ${want}`}`);
  }
  console.log(`${rows.length - bad}/${rows.length} land where they should`);
  process.exit(bad ? 1 : 0);
}
