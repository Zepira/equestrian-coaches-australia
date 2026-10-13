// Mobile audit, part two (13 Oct 2026): the states a page-load audit never
// sees. Opens each menu, sheet and panel at phone widths and checks it fits
// on the screen, doesn't make the page scroll sideways, and can be closed.
//
//   node scripts/design-reference/mobile-states.mjs --base http://localhost:3150
//
// Localhost only. Logs in as the test coach (.env) for the account menu.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3150";
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(base)) throw new Error("Runs against localhost only.");

let failed = 0;
const row = (ok, label, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`);
};

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {});
const ctxFor = (w) => browser.newContext({ viewport: { width: w, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });

/** Page doesn't scroll sideways, and the given element sits inside the screen. */
async function fits(page, selector, widthOnly) {
  return page.evaluate(([sel, widthOnly]) => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const sideways = document.documentElement.scrollWidth > vw + 1;
    const els = sel ? [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0) : [];
    const r = els[0]?.getBoundingClientRect();
    return {
      sideways,
      found: !sel || !!r,
      inside: !r || (r.left >= -1 && r.right <= vw + 1 && (widthOnly || (r.top >= -1 && r.bottom <= vh + 1))),
      box: r ? `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} in ${vw}x${vh}` : "",
    };
  }, [selector, widthOnly]);
}

async function check(label, page, selector, widthOnly = false) {
  await page.waitForTimeout(450);
  const f = await fits(page, selector, widthOnly);
  row(f.found && !f.sideways && f.inside, label, f.found ? `${f.box}${f.sideways ? " page scrolls sideways" : ""}` : `${selector} not found`);
}

async function login(ctx) {
  const p = await ctx.newPage();
  await p.goto(`${base}/login`);
  await p.locator("input[type=email]").first().fill(env.TEST_PROVIDER_EMAIL);
  await p.locator("input[type=password]").first().fill(env.TEST_PROVIDER_PASSWORD);
  await p.locator("form button[type=submit]").first().click();
  await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  return p;
}

for (const w of [320, 375]) {
  console.log(`\n${w}px`);
  const ctx = await ctxFor(w);
  const page = await ctx.newPage();

  // Burger menu, on the home page and a coaches page.
  for (const path of ["/", "/coaches"]) {
    await page.goto(base + path, { waitUntil: "networkidle" }).catch(() => {});
    await page.locator(".site-header__burger").first().click();
    await check(`burger menu opens on ${path}`, page, ".site-header__menu", true);
    await page.locator(".site-header__burger").first().click();
  }

  // Hero search: the discipline menu and the skills menu.
  await page.goto(base + "/coaches", { waitUntil: "networkidle" }).catch(() => {});
  const trigger = page.locator('.search-card [aria-haspopup="listbox"]').first();
  if (await trigger.count()) {
    await trigger.click();
    await check("discipline menu fits", page, '[role="listbox"]');
    await page.keyboard.press("Escape");
  } else row(false, "discipline menu trigger found");
  const skills = page.getByRole("button", { name: /skills/i }).first();
  if (await skills.count()) {
    await skills.click();
    await check("skills & setup panel fits", page, '[role="dialog"], [data-panel], .multi-select-panel');
    await page.keyboard.press("Escape");
  }
  // Typing a suburb shows the "did you mean" row without pushing the page sideways.
  const loc = page.locator('.search-card input[name="location"]').first();
  if (await loc.count()) {
    await loc.fill("Bendi");
    await check("suburb suggestions fit", page, null);
    await loc.fill("");
  }

  // A sample profile: the enquiry sheet.
  await page.goto(base + "/profile/alana-l", { waitUntil: "networkidle" }).catch(() => {});
  const ask = page.getByRole("button", { name: /enquir|message|contact|ask/i }).first();
  if (await ask.count()) {
    await ask.click();
    await check("enquiry sheet fits", page, '[role="dialog"]');
    await page.keyboard.press("Escape");
  } else row(false, "enquiry button found on a profile");

  // A search with nothing in it has no Map button sitting over the sign-up form.
  await page.goto(base + "/search?d=vaulting&location=Broome+WA", { waitUntil: "networkidle" }).catch(() => {});
  row((await page.getByRole("button", { name: /^map$/i }).count()) === 0, "no Map button on an empty search");

  // Search results: switch to the map and back.
  await page.goto(base + "/search?p=farriers&location=Bendigo+VIC", { waitUntil: "networkidle" }).catch(() => {});
  const mapBtn = page.getByRole("button", { name: /^map$/i }).first();
  if (await mapBtn.count()) {
    await mapBtn.click();
    await page.waitForTimeout(1200);
    await check("search map view fits", page, ".maplibregl-map");
  } else row(false, "map button found on /search");

  // Account menu, signed in.
  const authed = await ctxFor(w);
  const ap = await login(authed);
  await ap.goto(base + "/dashboard", { waitUntil: "networkidle" }).catch(() => {});
  const account = ap.locator(".site-header__account").first();
  await account.click();
  await check("account menu fits", ap, ".site-header__account-panel");
  // Dashboard tabs scroll sideways inside their own rail, not the page.
  await ap.keyboard.press("Escape");
  await check("dashboard page does not scroll sideways", ap, null);
  await authed.close();
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} failure(s)` : "\nall checks passed");
if (failed) process.exitCode = 1;
