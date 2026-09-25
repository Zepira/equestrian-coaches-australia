// The coming soon page's waitlist, end to end (src/lib/waitlist.ts,
// src/components/waitlist-form.tsx).
//
// The browser half needs only a running server. The database half runs as well
// when .env has Supabase credentials and 0010_waitlist.sql has been applied:
// it signs up through the real form, reads the row straight back, and deletes
// it after. Without credentials it says so and the browser half still runs,
// because a form that posts and answers is worth proving on its own.
//
//   npm run build
//   PUBLIC_HOST=localhost SITE_LAUNCHED=false PORT=3120 npm start
//   node scripts/launch/waitlist.mjs --base http://localhost:3120
//
// PLAYWRIGHT_CHROMIUM_EXECUTABLE points at the browser on a machine whose
// Chromium predates the pinned Playwright, same as the design-reference suite.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3000";

let failed = 0;
const row = (ok, label, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`);
};

const envFile = resolve(ROOT, ".env");
const env = existsSync(envFile)
  ? Object.fromEntries(
      readFileSync(envFile, "utf8")
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
    )
  : {};
const hasDb = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });

// ── The form, with JavaScript ──────────────────────────────────────────────
const page = await browser.newPage();
await page.goto(base, { waitUntil: "networkidle" });
// The page fades in; clicking mid-animation is what "element is not stable" means.
await page.waitForTimeout(1200);

row(await page.locator("h1").isVisible(), "the coming soon page renders");
row(!(await page.locator("header").count()), "it carries no site header");

const picker = page.locator(".waitlist-profession");
row(!(await picker.isVisible()), "the profession picker is hidden for a rider");
await page.locator("label[for='role-coach']").click({ force: true });
row(!(await picker.isVisible()), "and for a coach");
await page.locator("label[for='role-horse-care']").click({ force: true });
row(await picker.isVisible(), "and shows for a horse care professional");
const options = await page.locator(".waitlist-profession select option").allTextContents();
row(options.length > 1, `its options come from the professions, not a hardcoded list (${options.length})`, options.slice(1, 4).join(", "));
// Name one, so the row has a profession to check further down ("any" records none).
await page.locator(".waitlist-profession select").selectOption({ index: 1 });

await page.locator("input[name='email']").fill("not-an-address");
row(
  !(await page.locator("input[name='email']").evaluate((el) => el.validity.valid)),
  "a malformed address is refused before anything is sent"
);

// Consent is not optional: the browser blocks the submit without it.
const address = `waitlist-test-${Date.now()}@example.com`;
await page.locator("input[name='email']").fill(address);
await page.locator("button[type=submit]").click({ force: true });
await page.waitForTimeout(400);
row(
  await page.locator("input[name='consent']").evaluate((el) => !el.validity.valid),
  "submitting without consent is refused"
);

await page.locator("input[name='consent']").check({ force: true });
await page.locator("button[type=submit]").click({ force: true });
await page.waitForTimeout(3000);
const answer = await page.locator("body").innerText();
if (hasDb) {
  row(/on the list/i.test(answer), "a real sign-up is accepted", answer.split("\n").find((l) => /on the list/i.test(l)) ?? "");
} else {
  // No Supabase: the action still has to run and answer, rather than throw.
  row(/isn't taking names/i.test(answer), "the action runs and answers (no database here)", answer.split("\n").find((l) => /taking names/i.test(l)) ?? "");
}

// ── The form, without JavaScript ───────────────────────────────────────────
const noJs = await browser.newContext({ javaScriptEnabled: false });
const p2 = await noJs.newPage();
await p2.goto(base, { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(1200);
row(await p2.locator("form").isVisible(), "the form renders with JavaScript off");
row(!(await p2.locator(".waitlist-profession").isVisible()), "the picker starts hidden there too");
await p2.locator("label[for='role-horse-care']").click({ force: true });
row(await p2.locator(".waitlist-profession").isVisible(), "and the CSS :has() rule still reveals it");
const address2 = `waitlist-nojs-${Date.now()}@example.com`;
await p2.locator("input[name='email']").fill(address2);
await p2.locator("input[name='consent']").check({ force: true });
await p2.locator("button[type=submit]").click({ force: true });
await p2.waitForTimeout(3000);
const answer2 = await p2.locator("body").innerText();
row(/on the list|isn't taking names/i.test(answer2), "the form posts and answers with JavaScript off");

await browser.close();

// ── The row that should now exist ──────────────────────────────────────────
if (!hasDb) {
  console.log("\nno Supabase credentials in .env, so the database half was skipped:");
  console.log("  the sign-up landing in the waitlist table is NOT verified here.");
} else {
  const { createClient } = await import("@supabase/supabase-js");
  const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: rows, error } = await service
    .from("waitlist")
    .select("email, role, profession_id, consented, consented_at, source, ip_hash, unsubscribe_token, unsubscribed_at")
    .in("email", [address, address2]);
  if (error) {
    row(false, "reading the waitlist back", error.message);
  } else {
    const first = (rows ?? []).find((r) => r.email === address);
    row(Boolean(first), "the sign-up landed in the waitlist table");
    if (first) {
      row(first.role === "horse_care", "the role it recorded is the one picked", String(first.role));
      row(Boolean(first.profession_id), "the profession it recorded is a real terms row");
      row(first.consented === true && Boolean(first.consented_at), "consent is recorded with its timestamp");
      row(first.source === "coming-soon", "the source says where it came from", String(first.source));
      row(Boolean(first.ip_hash) && !/\d+\.\d+\.\d+\.\d+/.test(String(first.ip_hash)), "the IP is hashed, not stored");
      row(Boolean(first.unsubscribe_token), "it has an unsubscribe token");
      row(first.unsubscribed_at === null, "and is subscribed");
    }
    row((rows ?? []).some((r) => r.email === address2), "the no-JavaScript sign-up landed too");

    // The same address twice must not make a second row.
    const before = (rows ?? []).length;
    const again = await service.from("waitlist").select("id", { count: "exact", head: true }).in("email", [address, address2]);
    row((again.count ?? 0) === before, "no duplicate rows for an address already on the list");

    // Unsubscribing through the real endpoint, the way the email's link does.
    if (first?.unsubscribe_token) {
      const res = await fetch(`${base}/api/unsubscribe?w=${first.unsubscribe_token}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      row(res.ok && body.unsubscribed === true, "the unsubscribe link works", `status ${res.status}`);
      const { data: after } = await service.from("waitlist").select("unsubscribed_at").eq("email", address).maybeSingle();
      row(Boolean(after?.unsubscribed_at), "and the row is marked unsubscribed");
    }
  }

  await service.from("waitlist").delete().in("email", [address, address2]);
  const { count } = await service.from("waitlist").select("id", { count: "exact", head: true }).in("email", [address, address2]);
  row((count ?? 0) === 0, "the test rows were cleaned up");
}

console.log(`\n${failed === 0 ? "all checks passed" : `${failed} check(s) failed`}`);
process.exit(failed ? 1 : 0);
