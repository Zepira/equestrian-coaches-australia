// Discipline CMS smoke test (Phase 24). Throwaway admin logs in through the
// real form, adds a discipline, fills copy + SEO, uploads a photo, and the
// public pages are checked against the database after every step; then
// hide/show, image removal, and a real delete. Deletes the admin after.
// Needs `pg` (devDependency), playwright, and the dev server on :3000.
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
const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3000";
let failed = 0;
const row = (ok, label, detail = "") => { if (!ok) failed++; console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`); };
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const settle = (pg) => pg.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const stamp = Date.now();
const email = `cms-admin-${stamp}@example.com`;
const password = "Throwaway-1234!";
const NAME = `Smoke Discipline ${stamp}`;
const SLUG = `smoke-discipline-${stamp}`;
let userId, browser, termId;
try {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "rider", name: "Smoke Admin" } });
  if (error) throw error;
  userId = data.user.id;
  await wait(800);
  await q(`insert into admin_users (user_id) values ($1) on conflict do nothing`, [userId]);

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));

  // ── public, before anything changes ───────────────────────────────────
  const [{ n: activeCount }] = await q(`select count(*)::int n from terms where kind='discipline' and active`);
  await page.goto(`${base}/disciplines`, { waitUntil: "load" }); await settle(page);
  const cards = await page.locator("main ul li a[href^='/disciplines/']").count();
  row(cards === activeCount, "/disciplines shows one card per active discipline", `${cards} vs ${activeCount}`);
  row((await page.locator("button[aria-haspopup=dialog]").count()) >= 1, "/disciplines search card has Skills & setup");
  await page.goto(`${base}/disciplines/dressage`, { waitUntil: "load" }); await settle(page);
  row((await page.locator("button[aria-haspopup=dialog]").count()) >= 1, "/disciplines/dressage search card has Skills & setup");
  row((await page.locator("h1").innerText()).includes("Dressage"), "/disciplines/dressage renders the heading");
  await page.goto(`${base}/`, { waitUntil: "load" }); await settle(page);
  const homeDisc = await page.locator("a[href^='/disciplines/']").count();
  row(homeDisc >= activeCount, "homepage discipline tiles come from the terms table", String(homeDisc));
  row((await page.locator("header nav a[href='/disciplines']").count()) >= 1, "header links to /disciplines");

  // ── log in ────────────────────────────────────────────────────────────
  await page.goto(`${base}/login`, { waitUntil: "load" }); await settle(page);
  await page.locator("input[type=email], input[name=email]").first().fill(email);
  await page.locator("input[type=password]").first().fill(password);
  await page.locator("form button[type=submit]").first().click();
  await page.waitForTimeout(3500);

  // ── add a discipline ──────────────────────────────────────────────────
  await page.goto(`${base}/admin/disciplines`, { waitUntil: "load" }); await settle(page);
  row((await page.locator("main li").count()) >= activeCount, "admin list shows every discipline");
  await page.locator("input[name=name]").last().fill(NAME);
  await page.locator("form:has(input[name=name]) button[type=submit]").last().click();
  await page.waitForURL(/\/admin\/disciplines\/[0-9a-f-]{36}$/, { timeout: 15000 });
  termId = page.url().split("/").pop();
  const [created] = await q(`select slug, active, generates_pages from terms where id=$1`, [termId]);
  row(created?.slug === SLUG && created.active && created.generates_pages, "new discipline row: slug, active, generates_pages", JSON.stringify(created));

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
  await page.goto(`${base}/disciplines/${SLUG}`, { waitUntil: "load" }); await settle(page);
  const title = await page.title();
  const meta = await page.locator("meta[name=description]").getAttribute("content");
  const og = await page.locator("meta[property='og:image']").getAttribute("content");
  const heroSrc = await page.locator("main figure img").getAttribute("src");
  const paras = await page.locator("main section:has(h2:has-text('About')) p").allInnerTexts();
  row(title.startsWith("Smoke coaches near you"), "public page uses the SEO title", title);
  row(meta === "A meta description written by the smoke test.", "public page uses the SEO description", meta);
  row(og === publicUrl && heroSrc === publicUrl, "hero image and og:image are the upload", `${og}`);
  row(paras.length === 2 && paras[1].startsWith("Second paragraph"), "long copy renders as two paragraphs", String(paras.length));
  row((await page.locator("figcaption", { hasText: "Test Photographer" }).count()) === 1, "photo credit shown");
  await page.goto(`${base}/disciplines`, { waitUntil: "load" }); await settle(page);
  row((await page.locator(`main a[href='/disciplines/${SLUG}']`).count()) === 1, "index page lists the new discipline");
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  row(sitemap.includes(`/disciplines/${SLUG}`), "sitemap includes the new discipline");

  // ── hide / show ───────────────────────────────────────────────────────
  await page.goto(`${base}/admin/disciplines/${termId}`, { waitUntil: "load" }); await settle(page);
  await page.locator("button", { hasText: "Hide from site" }).click();
  await page.locator("button", { hasText: "Show on site" }).waitFor({ timeout: 15000 });
  const hidden = await fetch(`${base}/disciplines/${SLUG}`);
  row(hidden.status === 404, "hidden discipline's page is a 404", String(hidden.status));
  row(!(await (await fetch(`${base}/sitemap.xml`)).text()).includes(`/disciplines/${SLUG}`), "hidden discipline leaves the sitemap");
  await page.locator("button", { hasText: "Show on site" }).click();
  await page.locator("button", { hasText: "Hide from site" }).waitFor({ timeout: 15000 });
  row((await fetch(`${base}/disciplines/${SLUG}`)).status === 200, "shown again: page is back");

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
  await page.locator("button", { hasText: "Delete" }).click();
  await page.waitForURL(`${base}/admin/disciplines`, { timeout: 15000 });
  const gone = await q(`select 1 from terms where id=$1`, [termId]);
  row(gone.length === 0, "delete removes the row");
  termId = null;

  row(errs.length === 0, "no page errors", errs.join(" | "));
} finally {
  if (browser) await browser.close();
  if (termId) {
    const [t] = await q(`select image_path from terms where id=$1`, [termId]);
    if (t?.image_path) await service.storage.from("term-images").remove([t.image_path]);
    await q(`delete from terms where id=$1`, [termId]);
  }
  if (userId) await service.auth.admin.deleteUser(userId);
  await db.end();
}
console.log(failed ? `\n${failed} FAILED` : "\nall green");
process.exit(failed ? 1 : 0);
