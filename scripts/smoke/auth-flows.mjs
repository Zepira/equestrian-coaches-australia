// Sign-up and email-link smoke test, against a running production build.
//
// The case it exists for: a coach signs up in one browser (Messenger's) and
// opens the confirmation email in another (Gmail's). Each emailed link is
// opened here in a brand new browser context with no cookies at all, so a
// pass means the link works with nothing from the browser that asked for it.
//
//   1. sign up a throwaway provider through the real form → "Check your email",
//      with the resend button counting down
//   2. the confirmation link (admin generateLink, hashed token) opened cold on
//      /auth/confirm → onboarding, signed in
//   3. the same link again, and a made-up one → /login with the plain message
//      and a resend button
//   4. a password reset link opened cold → /reset-password, and setting a new
//      password there works
//   5. signing up again with the same (now confirmed) address → "You already
//      have an account", with Log in and Reset your password
//   6. next=//evil.example, https://evil.example and /\evil.example stay on
//      this site: on /auth/confirm (with real tokens), /auth/callback and /login
//   7. every throwaway user, provider and contact deleted
//
// Addresses are Resend's test inbox (delivered+…@resend.dev), so the one real
// email Supabase sends (step 1) is accepted and never bounces.
//
//   npm run build && npx next start -p 3110
//   node --experimental-strip-types scripts/smoke/auth-flows.mjs [--base http://localhost:3110]
//   (the flag lets Node 22 import src/lib/site-url.ts to test safeNextPath directly)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
if (!URL_ || !env.SUPABASE_SERVICE_ROLE_KEY || !env.DATABASE_PASSWORD) {
  console.error("auth-flows needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_PASSWORD in .env. Not run.");
  process.exit(2);
}
const ref = new URL(URL_).hostname.split(".")[0];
const db = new pg.Client({ connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(env.DATABASE_PASSWORD)}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`, ssl: { rejectUnauthorized: false } });
await db.connect();
const service = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3110";
const origin = new URL(base).origin;

let failed = 0;
let passed = 0;
const row = (ok, label, detail = "") => { if (!ok) failed++; else passed++; console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`); };
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const settle = (p) => p.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

const stamp = Date.now();
const email = `delivered+epa-auth-smoke-${stamp}@resend.dev`;
const password = "Throwaway-1234!";
const newPassword = "Throwaway-5678!";
const EVIL = ["//evil.example", "https://evil.example", "/\\evil.example"];
let browser;

/** A hashed token for this address, straight from the admin API (nothing is emailed). */
async function hashedToken(type, extra = {}) {
  const { data, error } = await service.auth.admin.generateLink({ type, email, ...extra });
  if (error) throw new Error(`generateLink ${type}: ${error.message}`);
  return data.properties.hashed_token;
}
const confirmUrl = (next, token, type) => `${base}/auth/confirm?next=${encodeURIComponent(next)}&token_hash=${encodeURIComponent(token)}&type=${type}`;

/** A brand new browser with no cookies: the "opened the email in another app" case. */
async function cold() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  return { ctx, page };
}

async function signUpThroughForm(page) {
  await page.goto(`${base}/signup?profession=coaches`);
  await settle(page);
  await page.locator("form input[autocomplete=name]").fill("Smoke Auth");
  await page.locator("form input[type=email]").fill(email);
  await page.locator("form input[type=password]").first().fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForSelector("h1:has-text('Check your email'), h1:has-text('already have an account')", { timeout: 20000 });
}

/** Whether the signed-in user in this page's cookies is our throwaway. */
async function signedInAs(page) {
  const cookies = await page.context().cookies(origin);
  return cookies.some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });

  // 0. The helper itself, straight from the source.
  const { safeNextPath } = await import(pathToFileURL(resolve(ROOT, "src/lib/site-url.ts")).href);
  row(EVIL.every((v) => safeNextPath(v, "/fb") === "/fb") && safeNextPath("/onboarding?plan=listed") === "/onboarding?plan=listed", "safeNextPath: refuses //, https:// and /\\, keeps a real path");

  // 1. Sign up through the form, in "Messenger's browser".
  {
    const { ctx, page } = await cold();
    await signUpThroughForm(page);
    row(await page.locator("h1:has-text('Check your email')").isVisible(), "sign-up: 'Check your email' screen");
    const resend = page.locator("form[data-resend=signup] button[type=submit]");
    const txt = await resend.innerText();
    row((await resend.isDisabled()) && /Send again in \d+s/.test(txt), "sign-up: resend button is waiting with a countdown", txt);
    await page.getByRole("button", { name: "Start again" }).click();
    row((await page.locator("form input[type=email]").inputValue()) === email, "sign-up: 'Start again' returns to the form with the details kept");
    await ctx.close();
  }
  const [user] = await q(`select id, email_confirmed_at from auth.users where lower(email)=lower($1)`, [email]);
  row(Boolean(user) && !user.email_confirmed_at, "sign-up: user exists, not yet confirmed");

  // 2. The confirmation link, opened cold.
  const signupToken = await hashedToken("signup", { password });
  {
    const { ctx, page } = await cold();
    await page.goto(confirmUrl("/onboarding", signupToken, "email"));
    await settle(page);
    const u = new URL(page.url());
    row(u.origin === origin && u.pathname === "/onboarding", "confirm: fresh browser lands on /onboarding", page.url());
    row(await signedInAs(page), "confirm: signed in (session cookie set)");
    const [after] = await q(`select email_confirmed_at from auth.users where id=$1`, [user.id]);
    row(Boolean(after?.email_confirmed_at), "confirm: email_confirmed_at set in the database");
    await ctx.close();
  }

  // 3. Used and made-up links → /login, plain message, resend button.
  for (const [label, url] of [
    ["used link", confirmUrl("/onboarding", signupToken, "email")],
    ["made-up link", confirmUrl("/onboarding", "0".repeat(56), "email")],
  ]) {
    const { ctx, page } = await cold();
    await page.goto(url);
    await settle(page);
    const u = new URL(page.url());
    const msg = await page.locator("[data-link-error]").innerText().catch(() => "");
    row(u.pathname === "/login" && u.searchParams.get("error") === "link", `${label}: lands on /login?error=link`, page.url());
    row(/That link didn.t work\. It may have expired, or been opened already\./.test(msg), `${label}: plain message shown`);
    row((await page.locator("[data-link-error] form[data-resend=signup] input[type=email]").count()) === 1 && /Send a new link/.test(msg), `${label}: asks for the email and offers a new link`);
    await ctx.close();
  }

  // 4. Password reset, opened cold.
  {
    const token = await hashedToken("recovery");
    const { ctx, page } = await cold();
    await page.goto(confirmUrl("/reset-password", token, "recovery"));
    await settle(page);
    row(new URL(page.url()).pathname === "/reset-password", "reset: fresh browser lands on /reset-password", page.url());
    await page.waitForSelector("h1:has-text('Set a new password')", { timeout: 10000 }).catch(() => {});
    row(await page.locator("h1:has-text('Set a new password')").isVisible(), "reset: the new-password form shows (signed in by the link)");
    const pw = page.locator("form input[type=password]");
    await pw.nth(0).fill(newPassword);
    await pw.nth(1).fill(newPassword);
    await page.getByRole("button", { name: "Set new password" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/reset-password"), { timeout: 20000 }).catch(() => {});
    row(/^\/(dashboard|onboarding)/.test(new URL(page.url()).pathname), "reset: new password saved, on to the dashboard", page.url());
    await ctx.close();
    const bad = await cold();
    await bad.page.goto(confirmUrl("/reset-password", token, "recovery"));
    await settle(bad.page);
    const u = new URL(bad.page.url());
    row(u.pathname === "/login" && u.searchParams.get("kind") === "recovery" && (await bad.page.locator("[data-link-error] form[data-resend=recovery]").count()) === 1, "reset: used link → /login with a new reset link offered", bad.page.url());
    await bad.ctx.close();
  }

  // 5. Same address again.
  {
    const { ctx, page } = await cold();
    await signUpThroughForm(page);
    row(await page.locator("h1:has-text('You already have an account with that email')").isVisible(), "sign-up twice: 'You already have an account'");
    row((await page.locator("a[href='/login']").filter({ hasText: "Log in" }).count()) >= 1 && (await page.locator("a[href='/forgot-password']").filter({ hasText: "Reset your password" }).count()) === 1, "sign-up twice: Log in and Reset your password links");
    await ctx.close();
  }

  // 6. Hostile next values stay on this site.
  for (const evil of EVIL) {
    // /auth/confirm with a real, working token (magic link tokens verify as type=email).
    const token = await hashedToken("magiclink");
    const c = await cold();
    await c.page.goto(confirmUrl(evil, token, "email"));
    await settle(c.page);
    const cu = new URL(c.page.url());
    row(cu.origin === origin && cu.pathname === "/onboarding", `next=${evil}: /auth/confirm falls back to /onboarding`, c.page.url());
    await c.ctx.close();

    // /auth/callback: read the redirect it sends, without following it.
    const res = await fetch(`${base}/auth/callback?code=not-a-real-code&next=${encodeURIComponent(evil)}`, { redirect: "manual" });
    const loc = new URL(res.headers.get("location") ?? "", base);
    row(res.status >= 300 && res.status < 400 && loc.origin === origin, `next=${evil}: /auth/callback redirects on this site`, loc.href);

    // /login: log in through the form, then see where it went.
    const l = await cold();
    await l.page.goto(`${base}/login?next=${encodeURIComponent(evil)}`);
    await settle(l.page);
    await l.page.locator("form input[type=email]").fill(email);
    await l.page.locator("form input[type=password]").fill(newPassword);
    await l.page.getByRole("button", { name: "Log in" }).click();
    await l.page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }).catch(() => {});
    const lu = new URL(l.page.url());
    row(lu.origin === origin && /^\/(dashboard|onboarding)/.test(lu.pathname), `next=${evil}: /login falls back to the dashboard`, l.page.url());
    await l.ctx.close();
  }
} catch (e) {
  row(false, "script error", e.stack?.split("\n").slice(0, 3).join(" | ") ?? e.message);
} finally {
  await browser?.close();
  const users = await q(`select id from auth.users where lower(email) like 'delivered+epa-auth-smoke-%@resend.dev'`);
  const ids = users.map((u) => u.id);
  if (ids.length) {
    const providers = await q(`select provider_id from provider_members where user_id = any($1::uuid[])`, [ids]);
    if (providers.length) await q(`delete from providers where id = any($1::uuid[])`, [providers.map((p) => p.provider_id)]);
    for (const id of ids) await service.auth.admin.deleteUser(id);
  }
  await q(`delete from contacts where lower(email) like 'delivered+epa-auth-smoke-%@resend.dev'`).catch(() => {});
  const [{ n }] = await q(
    `select ((select count(*) from auth.users where lower(email) like 'delivered+epa-auth-smoke-%@resend.dev')
      + (select count(*) from profiles where id = any($1::uuid[]))
      + (select count(*) from provider_members where user_id = any($1::uuid[])))::int as n`,
    [ids]
  );
  row(n === 0, `cleanup: ${ids.length} throwaway user(s), their provider and profile gone`);
  await db.end();
}
console.log(failed ? `\n${passed} ok, ${failed} FAIL` : `\nall ${passed} ok`);
process.exit(failed ? 1 : 0);
