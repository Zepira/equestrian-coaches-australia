// Discipline CMS smoke test, re-baselined for the CMS routes. A throwaway
// admin logs in through the real form, adds a discipline under coaching on
// /admin/disciplines, fills copy + SEO, uploads a photo, and the public pages
// (/coaches/[discipline], the /coaches discipline list, the sitemap) are
// checked against the database after every step; then hide/show, image
// removal, and a real delete. Deletes the admin, its change_log rows and
// anything left of the discipline after.
//   node scripts/smoke/discipline-cms.mjs [--base http://localhost:3110]
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

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
const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3110";
let failed = 0;
let passed = 0;
const row = (ok, label, detail = "") => { if (!ok) failed++; else passed++; console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`); };
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const settle = (p) => p.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Unique hrefs of discipline links on the /coaches page (the phone list and
// the desktop grid both render them).
const disciplineHrefs = (page) =>
  page.$$eval("#disciplines a[href^='/coaches/']", (as) => [...new Set(as.map((a) => a.getAttribute("href")).filter((h) => !h.startsWith("/coaches/in/")))]);

const stamp = Date.now();
const email = `smoke-cms-admin-${stamp}@example.com`;
const password = "Throwaway-1234!";
const NAME = `Smoke Discipline ${stamp}`;
const SLUG = `smoke-discipline-${stamp}`;
const PAGE = `/coaches/${SLUG}`;
let userId, browser, termId;
try {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "rider", name: "Smoke CMS Admin" } });
  if (error) throw error;
  userId = data.user.id;
  await wait(800);
  await q(`insert into admin_users (user_id) values ($1) on conflict do nothing`, [userId]);
  const [{ id: coachesId }] = await q(`select id from terms where kind='profession' and slug='coaches'`);

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));

  // ── public, before anything changes ───────────────────────────────────
  const [{ n: activeCount }] = await q(`select count(*)::int n from terms where kind='discipline' and active and parent_id=$1`, [coachesId]);
  const oldIndex = await fetch(`${base}/disciplines`, { redirect: "manual" });
  row([301, 308].includes(oldIndex.status) && oldIndex.headers.get("location") === "/coaches#disciplines", "/disciplines redirects to /coaches#disciplines", `${oldIndex.status} → ${oldIndex.headers.get("location")}`);
  const oldOne = await fetch(`${base}/disciplines/dressage`, { redirect: "manual" });
  row([301, 308].includes(oldOne.status) && oldOne.headers.get("location") === "/coaches/dressage", "/disciplines/dressage redirects to /coaches/dressage", `${oldOne.status} → ${oldOne.headers.get("location")}`);
  await page.goto(`${base}/coaches`, { waitUntil: "load" }); await settle(page);
  const cards = await disciplineHrefs(page);
  row(cards.length === activeCount, "/coaches lists one link per active coaching discipline", `${cards.length} vs ${activeCount}`);
  row((await page.locator("button[aria-haspopup=dialog]").count()) >= 1, "/coaches search card has Skills & setup");
  await page.goto(`${base}/coaches/dressage`, { waitUntil: "load" }); await settle(page);
  row((await page.locator("button[aria-haspopup=dialog]").count()) >= 1, "/coaches/dressage search card has Skills & setup");
  row((await page.locator("h1").innerText()).includes("Dressage"), "/coaches/dressage renders the heading");
  row((await page.locator("header a[href='/coaches#disciplines']").count()) >= 1, "header's Disciplines link goes to /coaches#disciplines");

  // ── log in ────────────────────────────────────────────────────────────
  await page.goto(`${base}/login`, { waitUntil: "load" }); await settle(page);
  await page.locator("input[type=email]").first().fill(email);
  await page.locator("input[type=password]").first().fill(password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });

  // ── add a discipline ──────────────────────────────────────────────────
  await page.goto(`${base}/admin/disciplines?p=coaches`, { waitUntil: "load" }); await settle(page);
  row((await page.locator("main ul > li:has(a[href^='/admin/disciplines/'])").count()) >= activeCount, "admin list shows every coaching discipline");
  const addForm = page.locator("form:has(input[name=profession_id])");
  row((await addForm.locator("input[name=profession_id]").inputValue()) === coachesId, "add form is scoped to coaching");
  await addForm.locator("input[name=name]").fill(NAME);
  await addForm.locator("button[type=submit]").click();
  await page.waitForURL(/\/admin\/disciplines\/[0-9a-f-]{36}$/, { timeout: 15000 });
  termId = page.url().split("/").pop();
  const [created] = await q(`select slug, active, generates_pages, parent_id, kind from terms where id=$1`, [termId]);
  row(created?.slug === SLUG && created.active && created.generates_pages && created.parent_id === coachesId && created.kind === "discipline", "new discipline row: slug, active, generates_pages, under coaching", JSON.stringify(created));
  await settle(page);

  // A new discipline is live straight away (the add form says so).
  const fresh = await fetch(`${base}${PAGE}`);
  row(fresh.status === 200, "new discipline's public page is live at once", String(fresh.status));
  row((await (await fetch(`${base}/sitemap.xml`)).text()).includes(`${PAGE}<`), "sitemap picks up the new discipline at once");

  // The editor must render before anything else here can run: every step
  // below is a control on it.
  const editorOk = (await page.locator("textarea[name=blurb]").count()) === 1;
  row(editorOk, "editor renders at /admin/disciplines/[id]", editorOk ? "" : `${page.url()} rendered: ${(await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 80)}`);
  if (!editorOk) {
    console.log("SKIP copy/SEO, upload, public page, hide/show, remove image and delete: they all need the editor");
  } else {
  // ── copy + SEO ────────────────────────────────────────────────────────
  await page.locator("textarea[name=blurb]").fill("A smoke-test discipline, here for a minute.");
  await page.locator("textarea[name=description]").fill("First paragraph of the long copy.\n\nSecond paragraph, after a blank line.");
  await page.locator("input[name=image_alt]").fill("A test image");
  await page.locator("input[name=image_credit]").fill("Test Photographer");
  await page.locator("input[name=seo_title]").fill("Smoke coaches near you");
  await page.locator("textarea[name=seo_description]").fill("A meta description written by the smoke test.");
  await page.locator("form button[type=submit]", { hasText: "Save changes" }).click();
  await page.locator("[role=status]", { hasText: "Saved." }).waitFor({ timeout: 15000 });
  const [saved] = await q(`select blurb, description, image_alt, image_credit, seo_title, seo_description from terms where id=$1`, [termId]);
  row(saved.blurb.startsWith("A smoke-test") && /\n\nSecond/.test(saved.description) && !saved.description.includes("\r") && saved.seo_title === "Smoke coaches near you" && saved.image_credit === "Test Photographer", "save writes every content field", JSON.stringify(saved));
  const [{ n: logged }] = await q(`select count(*)::int n from change_log where table_name='terms' and row_id=$1 and changed_by=$2`, [termId, userId]);
  row(logged >= 2, "change_log records the add and the save, by the admin", `n=${logged}`);

  // ── photo upload (generated in the page, sent through the real control) ──
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 2000; c.height = 1400;
    const g = c.getContext("2d"); g.fillStyle = "#b4553a"; g.fillRect(0, 0, 2000, 1400); g.fillStyle = "#1f3a2e"; g.fillRect(400, 300, 1200, 800);
    return c.toDataURL("image/png");
  });
  await page.locator("aside input[type=file]").setInputFiles({ name: "test.png", mimeType: "image/png", buffer: Buffer.from(dataUrl.split(",")[1], "base64") });
  await page.locator("aside button", { hasText: "Replace photo" }).waitFor({ timeout: 20000 });
  const [withImg] = await q(`select image_path from terms where id=$1`, [termId]);
  row(withImg.image_path?.startsWith(`discipline/${SLUG}/`), "upload stores the image path under the slug", withImg.image_path);
  const publicUrl = `${URL_}/storage/v1/object/public/term-images/${withImg.image_path}`;
  const head = await fetch(publicUrl);
  row(head.ok && head.headers.get("content-type")?.startsWith("image/"), "uploaded image is publicly readable", `${head.status} ${head.headers.get("content-type")}`);
  const dims = await page.evaluate(async (u) => { const b = await createImageBitmap(await (await fetch(u)).blob()); return [b.width, b.height]; }, publicUrl);
  row(dims[0] === 1600 && dims[1] === 1120, "client resized the 2000px source to 1600px", dims.join("x"));

  // ── public page reflects all of it ────────────────────────────────────
  const pubRes = await page.goto(`${base}${PAGE}`, { waitUntil: "load" }); await settle(page);
  row(pubRes?.status() === 200, `${PAGE} renders`, String(pubRes?.status()));
  const title = await page.title();
  const meta = await page.locator("meta[name=description]").getAttribute("content");
  const og = await page.locator("meta[property='og:image']").first().getAttribute("content");
  const heroSrc = await page.locator("main figure img").first().getAttribute("src");
  const paras = await page.locator("main section:has(h2:has-text('About')) p").allInnerTexts();
  row(title.startsWith("Smoke coaches near you"), "public page uses the SEO title", title);
  row(meta === "A meta description written by the smoke test.", "public page uses the SEO description", meta);
  row(og === publicUrl && heroSrc === publicUrl, "hero image and og:image are the upload", `${og}`);
  row(paras.length === 2 && paras[1].startsWith("Second paragraph"), "long copy renders as two paragraphs", String(paras.length));
  row((await page.locator("figcaption", { hasText: "Test Photographer" }).count()) === 1, "photo credit shown");
  await page.goto(`${base}/coaches`, { waitUntil: "load" }); await settle(page);
  row((await disciplineHrefs(page)).includes(PAGE), "/coaches lists the new discipline");
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  row(sitemap.includes(`${PAGE}<`), "sitemap includes the new discipline");

  // ── hide / show ───────────────────────────────────────────────────────
  await page.goto(`${base}/admin/disciplines/${termId}`, { waitUntil: "load" }); await settle(page);
  await page.locator("button", { hasText: "Hide from site" }).click();
  await page.locator("button", { hasText: "Show on site" }).waitFor({ timeout: 15000 });
  const [{ active: afterHide }] = await q(`select active from terms where id=$1`, [termId]);
  row(afterHide === false, "hide sets active = false");
  const hidden = await fetch(`${base}${PAGE}`);
  row(hidden.status === 404, "hidden discipline's page is a 404", String(hidden.status));
  row(!(await (await fetch(`${base}/sitemap.xml`)).text()).includes(`${PAGE}<`), "hidden discipline leaves the sitemap");
  await page.locator("button", { hasText: "Show on site" }).click();
  await page.locator("button", { hasText: "Hide from site" }).waitFor({ timeout: 15000 });
  row((await fetch(`${base}${PAGE}`)).status === 200, "shown again: page is back");

  // ── remove image ──────────────────────────────────────────────────────
  await page.locator("aside button", { hasText: "Remove" }).click();
  await page.locator("aside button", { hasText: "Upload photo" }).waitFor({ timeout: 15000 });
  const [noImg] = await q(`select image_path from terms where id=$1`, [termId]);
  row(noImg.image_path === null, "remove clears image_path");
  // The public URL may still answer from the CDN cache for a while (paths
  // are timestamped, so a stale hit is harmless) — ask storage itself.
  const { data: left } = await service.storage.from("term-images").list(`discipline/${SLUG}`);
  row((left ?? []).length === 0, "remove deletes the storage object", JSON.stringify(left));

  // ── delete (unreferenced) ─────────────────────────────────────────────
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/admin/disciplines", { timeout: 15000 });
  const gone = await q(`select 1 from terms where id=$1`, [termId]);
  row(gone.length === 0, "delete removes the row");
  row((await fetch(`${base}${PAGE}`)).status === 404, "deleted discipline's page is a 404");
  termId = null;
  }

  row(errs.length === 0, "no page errors", errs.join(" | "));
} catch (err) {
  row(false, "script error", err?.stack ?? String(err));
} finally {
  await browser?.close().catch(() => {});
  if (termId) {
    const [t] = await q(`select image_path from terms where id=$1`, [termId]);
    if (t?.image_path) await service.storage.from("term-images").remove([t.image_path]);
    await q(`delete from terms where id=$1`, [termId]);
  }
  const { data: stray } = await service.storage.from("term-images").list(`discipline/${SLUG}`);
  if (stray?.length) await service.storage.from("term-images").remove(stray.map((f) => `discipline/${SLUG}/${f.name}`));
  if (userId) {
    // The admin's own history rows (the add, save, hide/show, delete).
    await q(`delete from change_log where changed_by=$1`, [userId]);
    await service.auth.admin.deleteUser(userId);
  }
  await q(`delete from contacts where lower(email)=$1`, [email]);
  const [leftover] = await q(
    `select (select count(*) from terms where slug=$1)::int
          + (select count(*) from change_log where table_name='terms' and label=$2)::int
          + (select count(*) from contacts where lower(email)=$3)::int
          + (select count(*) from admin_users where user_id=$4)::int as n`,
    [SLUG, NAME, email, userId ?? null]
  );
  row(leftover.n === 0, "cleanup: discipline, history, contact and admin rows gone", `n=${leftover.n}`);
  row((await fetch(`${base}${PAGE}`)).status === 404, "cleanup: the discipline's page is gone");
  await db.end();
}
console.log(failed ? `\n${passed} ok, ${failed} FAILED` : `\nall green (${passed})`);
process.exit(failed ? 1 : 0);
