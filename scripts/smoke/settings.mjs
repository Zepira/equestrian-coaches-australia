// Settings smoke test (Phase 28). Throwaway admin logs in through the real
// form, changes the founding-offer date on /admin/settings, and /for-coaches
// plus the settings/settings_history tables are checked after each step. An
// invalid date must be refused, not applied. Restores the original value and
// deletes the admin after. Needs `pg`, playwright and the dev server on :3000.
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
const email = `settings-admin-${stamp}@example.com`;
const password = "Throwaway-1234!";
const KEY = "founding_offer_ends";
const NEW_DATE = "2027-06-15";
let userId, browser;
const [{ value: original }] = await q(`select value from settings where key=$1`, [KEY]);
const [{ n: historyBefore }] = await q(`select count(*)::int n from settings_history where key=$1`, [KEY]);
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

  // ── public page before ───────────────────────────────────────────────
  // The server caches settings for 60s, and a previous run's cleanup wrote
  // straight to the table, so give the cache time to expire before judging.
  let h2Before = "";
  for (let i = 0; i < 8; i++) {
    await page.goto(`${base}/for-coaches`, { waitUntil: "load" }); await settle(page);
    h2Before = (await page.locator(".founding h2").innerText()).replace(/\s+/g, " ");
    if (h2Before.startsWith("Free until 30 April 2027")) break;
    await wait(10_000);
  }
  row(h2Before.startsWith("Free until 30 April 2027"), "/for-coaches prints the seeded date", h2Before);

  // ── anonymous cannot write ───────────────────────────────────────────
  const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: anonErr } = await anon.from("settings").update({ value: "1999-01-01" }).eq("key", KEY).select();
  const [{ value: afterAnon }] = await q(`select value from settings where key=$1`, [KEY]);
  row(afterAnon === original, "anon key cannot change a setting (RLS)", anonErr?.message ?? "no error, value " + afterAnon);

  // ── log in ───────────────────────────────────────────────────────────
  await page.goto(`${base}/login`, { waitUntil: "load" }); await settle(page);
  await page.locator("input[type=email], input[name=email]").first().fill(email);
  await page.locator("input[type=password]").first().fill(password);
  await page.locator("form button[type=submit]").first().click();
  await page.waitForTimeout(3500);

  // ── admin page ───────────────────────────────────────────────────────
  await page.goto(`${base}/admin/settings`, { waitUntil: "load" }); await settle(page);
  row((await page.locator("nav a[href='/admin/settings']").count()) === 1, "Settings tab in the admin nav");
  row((await page.locator("input[name=value]").inputValue()) === original, "date field shows the stored value", original);
  row((await page.locator("main").innerText()).includes("migration"), "history lists the seed row as 'migration'");

  // ── invalid: past date refused ───────────────────────────────────────
  await page.locator("input[name=value]").fill("2020-01-01");
  await page.locator("form:has(input[name=value]) button[type=submit]").click();
  await page.waitForTimeout(2500);
  const [{ value: afterBad }] = await q(`select value from settings where key=$1`, [KEY]);
  row(afterBad === original, "past date is refused, value unchanged", afterBad);
  row((await page.locator("main").innerText()).includes("can't end in the past"), "refusal message shown");

  // ── valid change ─────────────────────────────────────────────────────
  await page.locator("input[name=value]").fill(NEW_DATE);
  await page.locator("form:has(input[name=value]) button[type=submit]").click();
  await page.waitForTimeout(2500);
  const [{ value: afterGood, updated_by }] = await q(`select value, updated_by from settings where key=$1`, [KEY]);
  row(afterGood === NEW_DATE, "valid date saved", afterGood);
  row(updated_by === userId, "updated_by is the admin who saved");
  const hist = await q(`select old_value, new_value, changed_by from settings_history where key=$1 order by id desc limit 2`, [KEY]);
  row(hist.length === 1 || hist[1].new_value !== NEW_DATE, "exactly one history row for the change", JSON.stringify(hist));
  row(hist[0]?.old_value === original && hist[0].new_value === NEW_DATE && hist[0].changed_by === userId, "history row: old → new, by the admin", JSON.stringify(hist[0]));
  row((await page.locator("main").innerText()).includes("Saved."), "'Saved.' confirmation shown");

  // ── public page after ────────────────────────────────────────────────
  await page.goto(`${base}/for-coaches`, { waitUntil: "load" }); await settle(page);
  const h2After = await page.locator(".founding h2").innerText();
  row(h2After.replace(/\s+/g, " ").startsWith("Free until 15 June 2027"), "/for-coaches prints the new date straight away (cache cleared on save)", h2After);

  row(errs.length === 0, "no page errors", errs.join(" | "));
} finally {
  // restore + clean up
  await q(`update settings set value=$2 where key=$1`, [KEY, original]);
  await q(`delete from settings_history where key=$1 and id not in (select id from settings_history where key=$1 order by id asc limit $2)`, [KEY, historyBefore]);
  const [{ value: restored }] = await q(`select value from settings where key=$1`, [KEY]);
  const [{ n: historyAfter }] = await q(`select count(*)::int n from settings_history where key=$1`, [KEY]);
  row(restored === original && historyAfter === historyBefore, "restored original value and trimmed history", `${restored}, ${historyAfter} rows`);
  if (userId) await service.auth.admin.deleteUser(userId);
  await browser?.close();
  await db.end();
  console.log(failed ? `\n${failed} FAILED` : "\nall green");
  process.exit(failed ? 1 : 0);
}
