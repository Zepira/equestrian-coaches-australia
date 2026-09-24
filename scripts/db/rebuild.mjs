// Stage 1 of the CMS rebuild (docs/cms-build-checklist.md): wipe the public
// schema and rebuild it from supabase/migrations/0001_baseline.sql, then
// reload places, reseed the taxonomy and professions, and restore the
// accounts worth keeping from the stage 0 export.
//
//   node scripts/db/export-keepers.mjs          (first, always)
//   node scripts/db/rebuild.mjs --yes-wipe
//
// What survives: auth users (logins), except any in DROP_EMAIL_DOMAINS.
// Everything in `public` is dropped. Storage: coach-photos and coach-videos
// are emptied and deleted; provider-photos and provider-videos are created;
// term-images is kept. The profile rows, admin grants and Alana's provider
// profile are rebuilt from the export.
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { FEATURED_DISCIPLINES, NEW_SHARED_ATTRIBUTES, PROFESSIONS, SHARED_ATTRIBUTE_SLUGS } from "../../supabase/seed/professions.mjs";

if (!process.argv.includes("--yes-wipe")) {
  console.error("This drops every table in public. Run with --yes-wipe once the export exists.");
  process.exit(1);
}

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ref = new URL(SUPABASE_URL).hostname.split(".")[0];

// Kim's second account was a typo'd address that can never receive email.
const DROP_EMAIL_DOMAINS = ["gnail.com"];

const exportDir = resolve(
  ROOT,
  "supabase/data",
  readdirSync(resolve(ROOT, "supabase/data")).filter((d) => d.startsWith("pre-rebuild-")).sort().at(-1)
);
const exported = JSON.parse(readFileSync(resolve(exportDir, "export.json"), "utf8"));
console.log(`export: ${exportDir}`);

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ── Storage API ─────────────────────────────────────────────────────────────
const storage = async (method, path, body) => {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok && res.status !== 404) throw new Error(`storage ${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
};

const client = new pg.Client({
  connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(env.DATABASE_PASSWORD)}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const q = (sql, params) => client.query(sql, params);

try {
  // ── 1. Storage ────────────────────────────────────────────────────────────
  console.log("1. storage");
  const objects = (await q("select bucket_id, name from storage.objects where bucket_id in ('coach-photos','coach-videos')")).rows;
  for (const bucket of ["coach-photos", "coach-videos"]) {
    const names = objects.filter((o) => o.bucket_id === bucket).map((o) => o.name);
    if (names.length) await storage("DELETE", `object/${bucket}`, { prefixes: names });
    await storage("DELETE", `bucket/${bucket}`);
  }
  const existing = new Set(((await storage("GET", "bucket")) ?? []).map((b) => b.id));
  for (const bucket of ["provider-photos", "provider-videos", "term-images"]) {
    if (!existing.has(bucket)) await storage("POST", "bucket", { id: bucket, name: bucket, public: true });
  }

  // ── 2. Wipe and baseline ──────────────────────────────────────────────────
  console.log("2. wipe public, run baseline");
  await q("drop schema public cascade");
  await q("create schema public");
  await q(readFileSync(resolve(ROOT, "supabase/migrations/0001_baseline.sql"), "utf8"));

  // ── 3. Places ─────────────────────────────────────────────────────────────
  console.log("3. postcodes and areas");
  const csv = readFileSync(resolve(ROOT, "supabase/data/australian_postcodes.csv"), "utf8");
  const parseLine = (line) => {
    const out = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') quoted = false;
        else cur += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = parseLine(lines[0]);
  const col = (name) => header.indexOf(name);
  const [iPc, iLoc, iState, iLat, iLong] = ["postcode", "locality", "state", "lat", "long"].map(col);
  const seen = new Set();
  const rows = [];
  for (const line of lines.slice(1)) {
    const f = parseLine(line);
    const postcode = f[iPc]?.trim(), suburb = f[iLoc]?.trim(), state = f[iState]?.trim();
    const lat = parseFloat(f[iLat]), long = parseFloat(f[iLong]);
    if (!postcode || !suburb || !state || Number.isNaN(lat) || Number.isNaN(long)) continue;
    const key = `${postcode}|${suburb}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([postcode, suburb, state, lat, long]);
  }
  for (let i = 0; i < rows.length; i += 1000) {
    const batch = rows.slice(i, i + 1000);
    const values = batch.map((_, j) => `($${j * 5 + 1}, $${j * 5 + 2}, $${j * 5 + 3}, st_setsrid(st_makepoint($${j * 5 + 5}, $${j * 5 + 4}), 4326)::geography, $${j * 5 + 4}, $${j * 5 + 5})`);
    await q(
      `insert into public.postcodes (postcode, suburb, state, location, lat, long) values ${values.join(",")} on conflict do nothing`,
      batch.flat()
    );
  }
  // Areas, exactly as 0009 built them: one per distinct suburb and state.
  await q(`
    insert into public.areas (slug, name, kind, state, centroid, lat, long)
    select public.slugify(lower(trim(suburb))) || '-' || lower(state),
           initcap(lower(trim(suburb))), 'suburb', state,
           st_setsrid(st_makepoint(avg(long), avg(lat)), 4326)::geography, avg(lat), avg(long)
    from public.postcodes
    group by lower(trim(suburb)), state
    on conflict (slug) do nothing`);
  await q(`
    update public.postcodes p set area_id = a.id
    from public.areas a
    where a.state = p.state and a.slug = public.slugify(lower(trim(p.suburb))) || '-' || lower(p.state)`);

  // ── 4. Professions ────────────────────────────────────────────────────────
  console.log("4. professions");
  const professionId = {};
  for (const [i, p] of PROFESSIONS.entries()) {
    const { rows: [t] } = await q(
      `insert into public.terms (kind, slug, name, blurb, generates_pages, sort_order)
       values ('profession', $1, $2, $3, true, $4) returning id`,
      [p.slug, p.name, p.blurb, i]
    );
    professionId[p.slug] = t.id;
    await q(
      `insert into public.profession_details
        (term_id, door, glyph_key, launch_state, singular, plural, short_name, term_noun, term_noun_plural,
         audience_noun, years_label, job_title, hero_headline, hero_lead, hero_lead_short, steps,
         enquiry_options, completeness, events_enabled, remote_allowed)
       values ($1, $2, $3, 'live', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, $18)`,
      [
        t.id, p.door, p.glyph_key, p.singular, p.plural, p.short_name ?? null, p.term_noun, p.term_noun_plural,
        p.audience_noun, p.years_label, p.job_title, p.hero_headline ?? "", p.hero_lead ?? p.blurb, p.hero_lead_short ?? "",
        JSON.stringify(p.steps), JSON.stringify(p.enquiry_options), JSON.stringify(p.completeness), p.remote_allowed,
      ]
    );
  }
  const coachesId = professionId.coaches;

  // ── 5. Taxonomy from the export, ids kept ─────────────────────────────────
  console.log("5. disciplines, skills, attributes, aliases, suggestions");
  for (const t of exported.terms) {
    const parent = t.kind === "attribute" && SHARED_ATTRIBUTE_SLUGS.includes(t.slug) ? null : coachesId;
    const featured = t.kind === "discipline" && FEATURED_DISCIPLINES.includes(t.slug);
    await q(
      `insert into public.terms (id, kind, parent_id, slug, name, blurb, description, image_path, image_alt, image_credit,
         seo_title, seo_description, generates_pages, active, featured, featured_order, sort_order, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        t.id, t.kind, parent, t.slug, t.name, t.blurb, t.description, t.image_path, t.image_alt, t.image_credit,
        t.seo_title, t.seo_description, t.generates_pages, t.active, featured,
        featured ? FEATURED_DISCIPLINES.indexOf(t.slug) : 0, t.sort_order, t.created_at, t.updated_at,
      ]
    );
  }
  for (const a of NEW_SHARED_ATTRIBUTES) {
    await q(`insert into public.terms (kind, parent_id, slug, name, blurb) values ('attribute', null, $1, $2, $3)`, [a.slug, a.name, a.blurb]);
  }
  for (const a of exported.term_aliases) {
    await q(
      `insert into public.term_aliases (id, term_id, alias, is_primary, source, created_at) values ($1,$2,$3,$4,$5,$6) on conflict do nothing`,
      [a.id, a.term_id, a.alias, a.is_primary, a.source, a.created_at]
    );
  }
  for (const s of exported.term_suggestions) {
    await q(`insert into public.term_suggestions (for_term_id, term_id, sort_order) values ($1,$2,$3)`, [s.discipline_id, s.term_id, s.sort_order]);
  }

  // ── 6. Horse care specialities and every profession's aliases ─────────────
  console.log("6. specialities and profession aliases");
  for (const p of PROFESSIONS) {
    for (const alias of p.aliases ?? []) {
      await q(`insert into public.term_aliases (term_id, alias) values ($1, $2) on conflict do nothing`, [professionId[p.slug], alias]);
    }
    for (const [i, name] of (p.specialities ?? []).entries()) {
      await q(
        `insert into public.terms (kind, parent_id, slug, name, generates_pages, sort_order) values ('discipline', $1, $2, $3, true, $4)`,
        [professionId[p.slug], slugify(name), name, i]
      );
    }
  }

  // ── 7. Settings ───────────────────────────────────────────────────────────
  console.log("7. settings");
  for (const [key, value] of [["launch_date", ""], ["founding_free_months", "6"], ["founding_join_by", ""]]) {
    await q(`insert into public.settings (key, value) values ($1, $2)`, [key, value]);
  }

  // ── 8. Accounts ───────────────────────────────────────────────────────────
  console.log("8. accounts");
  for (const domain of DROP_EMAIL_DOMAINS) {
    const { rowCount } = await q(`delete from auth.users where email ilike $1`, [`%@${domain}`]);
    if (rowCount) console.log(`   deleted ${rowCount} account(s) at ${domain}`);
  }
  const authUsers = (await q(`select id, email from auth.users`)).rows;
  const oldProfile = Object.fromEntries(exported.users.map((u) => [u.id, u]));
  for (const u of authUsers) {
    const old = oldProfile[u.id];
    const role = old?.role === "rider" ? "rider" : "provider";
    const name = old?.name?.trim() || u.email.split("@")[0];
    await q(`insert into public.profiles (id, role, name, email) values ($1, $2, $3, $4)`, [u.id, role, name, u.email]);
  }
  for (const a of exported.admins) {
    if (authUsers.some((u) => u.id === a.user_id)) await q(`insert into public.admin_users (user_id) values ($1)`, [a.user_id]);
  }

  // Providers from the old coach profiles, keeping their ids (so photo paths
  // still match) and publishing the ones that were published.
  for (const c of exported.coach_profiles) {
    const owner = authUsers.find((u) => u.id === c.id);
    if (!owner) continue;
    const name = oldProfile[c.id]?.name?.trim() || owner.email.split("@")[0];
    await q(
      `insert into public.providers (id, slug, name, headline, bio, suburb, state, postcode, location, lat, long, area_id,
         travel_radius_km, travels_to_client, qualifications, contact_email, contact_phone, facebook_url,
         show_contact_email, show_contact_phone, show_facebook, show_contact_form, video_url, video_storage_path,
         availability, years_experience, status, published_at, cohort, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,
         case when $9::float8 is null then null else st_setsrid(st_makepoint($10, $9), 4326)::geography end, $9, $10,
         (select area_id from public.postcodes where postcode = $8 and upper(suburb) = upper($6) limit 1),
         $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,null,$22::public.availability,$23,$24,$25,'founding',$26,$27)`,
      [
        c.id, c.slug, name, c.headline, c.bio, c.suburb, c.state, c.postcode, c.lat, c.long,
        c.travel_radius_km, c.travels_to_rider, c.qualifications, c.contact_email, c.contact_phone, c.facebook_url,
        c.show_contact_email, c.show_contact_phone, c.show_facebook, c.show_contact_form, c.video_url,
        c.taking_students ?? "yes", c.years_coaching, c.published ? "published" : "draft", c.published ? new Date() : null,
        c.created_at, c.updated_at,
      ]
    );
    await q(`insert into public.provider_members (provider_id, user_id, role) values ($1, $1, 'owner')`, [c.id]);
    await q(`insert into public.provider_terms (provider_id, term_id, sort_order) values ($1, $2, 0)`, [c.id, coachesId]);
    for (const ct of exported.coach_terms.filter((x) => x.coach_id === c.id)) {
      await q(`insert into public.provider_terms (provider_id, term_id, sort_order, detail) values ($1,$2,$3,$4) on conflict do nothing`, [c.id, ct.term_id, ct.sort_order, ct.detail]);
    }
    for (const ph of exported.coach_photos.filter((x) => x.coach_id === c.id)) {
      await q(`insert into public.provider_photos (id, provider_id, storage_path, sort_order) values ($1,$2,$3,$4)`, [ph.id, c.id, ph.storage_path, ph.sort_order]);
      const file = readFileSync(resolve(exportDir, "coach-photos", ph.storage_path.replace(/\//g, "__")));
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/provider-photos/${ph.storage_path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": ph.storage_path.endsWith(".png") ? "image/png" : "image/jpeg", "x-upsert": "true" },
        body: file,
      });
      if (!up.ok) throw new Error(`photo upload ${ph.storage_path}: ${up.status} ${await up.text()}`);
    }
    if (c.subscription_tier) {
      await q(
        `insert into public.subscriptions (provider_id, tier, status, founding, stripe_customer_id, stripe_subscription_id)
         values ($1, $2, $3, true, $4, $5)`,
        [c.id, c.subscription_tier, c.subscription_status === "active" ? "active" : "inactive", c.stripe_customer_id, c.stripe_subscription_id]
      );
    }
  }

  await q(`select public.recompute_indexable_pages(3)`);

  // ── 9. Counts ─────────────────────────────────────────────────────────────
  const count = async (sql) => (await q(sql)).rows[0].n;
  console.log("done:");
  for (const [label, sql] of [
    ["postcodes", "select count(*)::int n from public.postcodes"],
    ["areas", "select count(*)::int n from public.areas"],
    ["postcodes without area", "select count(*)::int n from public.postcodes where area_id is null"],
    ["professions", "select count(*)::int n from public.terms where kind = 'profession'"],
    ["disciplines + specialities", "select count(*)::int n from public.terms where kind = 'discipline'"],
    ["  of which coaching", `select count(*)::int n from public.terms where kind = 'discipline' and parent_id = '${coachesId}'`],
    ["skills", "select count(*)::int n from public.terms where kind = 'skill'"],
    ["attributes", "select count(*)::int n from public.terms where kind = 'attribute'"],
    ["  shared", "select count(*)::int n from public.terms where kind = 'attribute' and parent_id is null"],
    ["aliases", "select count(*)::int n from public.term_aliases"],
    ["suggestions", "select count(*)::int n from public.term_suggestions"],
    ["profiles", "select count(*)::int n from public.profiles"],
    ["admins", "select count(*)::int n from public.admin_users"],
    ["providers", "select count(*)::int n from public.providers"],
    ["published providers", "select count(*)::int n from public.providers where status = 'published'"],
    ["provider photos", "select count(*)::int n from public.provider_photos"],
    ["settings", "select count(*)::int n from public.settings"],
  ]) console.log(`   ${label}: ${await count(sql)}`);
} finally {
  await client.end();
}
