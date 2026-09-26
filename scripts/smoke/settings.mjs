// Settings smoke test, re-baselined for the CMS settings. The founding offer
// end date it used to change is gone, so it now uses `event_reach_km` (how
// far a Clinic plan's events are emailed): a real, validated number setting
// that no page prints and that only the rider-email job reads, so a moment
// at another value touches nobody. A throwaway admin logs in through the
// real form; an out-of-range value must be refused, not applied; a valid one
// saves with exactly one settings_history row by that admin; then the
// original is restored through the same form, so the app's settings cache
// ends at the original value. If there was no row before, the row and every
// history row this run wrote are deleted after.
//   node scripts/smoke/settings.mjs [--base http://localhost:3110]
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

const stamp = Date.now();
const email = `smoke-settings-admin-${stamp}@example.com`;
const password = "Throwaway-1234!";
const KEY = "event_reach_km";
const DEFAULT = "250"; // DEFAULTS.event_reach_km in src/lib/settings.ts
const NEW_VALUE = "300";
const BAD_VALUE = "3000"; // SETTING_RANGES.event_reach_km is 25 to 2000
const stored = async () => (await q(`select value, updated_by from settings where key=$1`, [KEY]))[0] ?? null;

const before = await stored();
const original = before?.value ?? DEFAULT;
const [{ max: historyMaxBefore }] = await q(`select coalesce(max(id), 0)::bigint as max from settings_history`);
let userId, browser;

// The setting's own form on /admin/settings, and a save through it that
// waits for the server action's POST (it redirects back to the page).
const form = (page) => page.locator(`form:has(input[name=key][value=${KEY}])`);
const save = async (page, value, { expectRefusal = false } = {}) => {
  const f = form(page);
  if (expectRefusal) {
    // min/max/required would stop the browser sending it; the server must refuse it too.
    await f.locator("input[name=value]").evaluate((el) => { el.removeAttribute("min"); el.removeAttribute("max"); el.removeAttribute("required"); });
  }
  await f.locator("input[name=value]").fill(value);
  const posted = page.waitForResponse((r) => r.request().method() === "POST", { timeout: 15000 });
  await f.locator("button[type=submit]").click();
  await posted;
  // The action redirects to ?saved=<key> or ?error=…&key=<key>; wait for the
  // client navigation to land before reading the page.
  await page.waitForURL((u) => (expectRefusal ? u.searchParams.has("error") && u.searchParams.get("key") === KEY : u.searchParams.get("saved") === KEY), { timeout: 15000 }).catch(() => {});
  await settle(page);
};

try {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "rider", name: "Smoke Settings Admin" } });
  if (error) throw error;
  userId = data.user.id;
  await wait(800);
  await q(`insert into admin_users (user_id) values ($1) on conflict do nothing`, [userId]);

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));

  // ── anonymous cannot write ───────────────────────────────────────────
  const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: anonUpd } = await anon.from("settings").update({ value: "1999" }).eq("key", KEY).select();
  const { error: anonIns } = await anon.from("settings").insert({ key: `smoke_${stamp}`, value: "x" });
  const afterAnon = await stored();
  const [{ n: anonRows }] = await q(`select count(*)::int n from settings where key=$1`, [`smoke_${stamp}`]);
  row((afterAnon?.value ?? DEFAULT) === original && anonRows === 0 && Boolean(anonIns), "anon key cannot change or add a setting (RLS)", anonIns?.message ?? anonUpd?.message ?? "");

  // ── the settings page is admin-only ──────────────────────────────────
  const anonAdmin = await fetch(`${base}/admin/settings`, { redirect: "manual" });
  row(anonAdmin.status >= 300 && anonAdmin.status < 400, "signed out, /admin/settings redirects", `${anonAdmin.status} → ${anonAdmin.headers.get("location")}`);

  // ── log in ───────────────────────────────────────────────────────────
  await page.goto(`${base}/login`, { waitUntil: "load" }); await settle(page);
  await page.locator("input[type=email]").first().fill(email);
  await page.locator("input[type=password]").first().fill(password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });

  // ── admin page ───────────────────────────────────────────────────────
  await page.goto(`${base}/admin/settings`, { waitUntil: "load" }); await settle(page);
  row((await page.locator("a[href='/admin/settings']").count()) >= 1, "Settings tab in the admin nav");
  row((await form(page).count()) === 1, `${KEY} has its own form`);
  row((await form(page).locator("input[name=value]").inputValue()) === original, "field shows the stored value (or the code default)", original);

  // ── invalid: out of range is refused ─────────────────────────────────
  await save(page, BAD_VALUE, { expectRefusal: true });
  const afterBad = await stored();
  row((afterBad?.value ?? DEFAULT) === original, "out-of-range value is refused, value unchanged", afterBad?.value ?? "(no row)");
  row((await page.locator("main").innerText()).includes("Enter a whole number from 25 to 2000."), "refusal message shown");
  const [{ n: badHistory }] = await q(`select count(*)::int n from settings_history where key=$1 and id > $2`, [KEY, historyMaxBefore]);
  row(badHistory === 0, "a refused value writes no history");

  // ── valid change ─────────────────────────────────────────────────────
  await save(page, NEW_VALUE);
  const afterGood = await stored();
  row(afterGood?.value === NEW_VALUE, "valid value saved", afterGood?.value);
  row(afterGood?.updated_by === userId, "updated_by is the admin who saved");
  const hist = await q(`select old_value, new_value, changed_by from settings_history where key=$1 and id > $2 order by id`, [KEY, historyMaxBefore]);
  row(hist.length === 1, "exactly one history row for the change", JSON.stringify(hist));
  row(hist[0]?.old_value === (before ? original : null) && hist[0]?.new_value === NEW_VALUE && hist[0]?.changed_by === userId, "history row: old → new, by the admin", JSON.stringify(hist[0]));
  const main = await page.locator("main").innerText();
  row(new URL(page.url()).searchParams.get("saved") === KEY && main.includes("Saved."), "'Saved.' confirmation shown");
  row(main.includes(`${KEY}`) && main.includes(`→ ${NEW_VALUE}`) && main.includes("Smoke Settings Admin"), "history list on the page shows the change and who made it");
  row((await form(page).locator("input[name=value]").inputValue()) === NEW_VALUE, "field shows the new value");

  // ── restore through the same form, so the app's cache ends at the original ─
  await save(page, original);
  const restoredRow = await stored();
  row(restoredRow?.value === original, "original value restored through the admin form", restoredRow?.value);
  const hist2 = await q(`select old_value, new_value from settings_history where key=$1 and id > $2 order by id`, [KEY, historyMaxBefore]);
  row(hist2.length === 2 && hist2[1].old_value === NEW_VALUE && hist2[1].new_value === original, "restore wrote its own history row", JSON.stringify(hist2[1]));

  row(errs.length === 0, "no page errors", errs.join(" | "));
} catch (err) {
  row(false, "script error", err?.stack ?? String(err));
} finally {
  // Belt and braces if a step failed part-way: the stored value goes back.
  const now = await stored();
  if (before && now?.value !== original) await q(`update settings set value=$2 where key=$1`, [KEY, original]);
  // No row before: the app's cache now holds the original (the default) from
  // the restore, so the row this run created can go, and its history with it.
  if (!before) await q(`delete from settings where key=$1`, [KEY]);
  await q(`delete from settings_history where key=$1 and id > $2`, [KEY, historyMaxBefore]);
  if (userId) await service.auth.admin.deleteUser(userId);
  await q(`delete from contacts where lower(email)=$1`, [email]);
  const end = await stored();
  const [{ n: historyLeft }] = await q(`select count(*)::int n from settings_history where key=$1 and id > $2`, [KEY, historyMaxBefore]);
  row((before ? end?.value === original : end === null) && historyLeft === 0, "settings row and history back as they were", `${end?.value ?? "(no row)"}, ${historyLeft} new history rows`);
  await browser?.close().catch(() => {});
  await db.end();
  console.log(failed ? `\n${passed} ok, ${failed} FAILED` : `\nall green (${passed})`);
  process.exit(failed ? 1 : 0);
}
