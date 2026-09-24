// Behaviour checks for the site header's navigation: the parent brand's
// "Horse care" / "Coaches" menus on the front-door routes, the coaches
// section's own nav everywhere else, and the phone menu's flat equivalent.
// Covers what computed styles can't — opening, closing, keyboard operation
// and focus. Prints ok/FAIL rows, exits 1 on any FAIL.
//
//   node scripts/design-reference/nav-behaviour.mjs [--base http://localhost:3000]
//
// PLAYWRIGHT_CHROMIUM_EXECUTABLE points at an already-installed Chromium
// when the machine's build doesn't match the pinned Playwright version.

import { chromium } from "playwright";

const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:3000";
const results = [];
const ok = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });


// ── desktop ────────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && !/ERR_TUNNEL_CONNECTION_FAILED|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  // Outbound image hosts (the mock coaches' Unsplash photos) are blocked in
  // some sandboxes; that is the environment, not the page.
  page.on("requestfailed", (r) => {
    const host = new URL(r.url()).host;
    if (!host.includes("unsplash")) errors.push(`request failed: ${r.url()}`);
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "networkidle" });

  const header = page.locator("header.site-header");
  const hc = header.getByRole("button", { name: /Horse care/ });
  const co = header.getByRole("button", { name: /^Coaches/ });

  ok("both menu buttons present", (await hc.count()) === 1 && (await co.count()) === 1);
  ok("panel closed initially", (await header.locator(".site-header__subbar").count()) === 0);

  // the labels are real links to each section's own page
  ok("Horse care label links to /horse-care", (await header.getByRole("link", { name: "Horse care", exact: true }).getAttribute("href")) === "/horse-care");
  ok("Coaches label links to /coaches", (await header.getByRole("link", { name: "Coaches", exact: true }).getAttribute("href")) === "/coaches");

  // hover opens, moving into the panel keeps it open, leaving closes it
  await header.getByRole("link", { name: "Horse care", exact: true }).hover();
  await page.waitForTimeout(150);
  ok("hover opens the sub-menu bar", (await header.locator(".site-header__subbar").count()) === 1);
  const geo = await page.evaluate(() => {
    const h = document.querySelector("header.site-header").getBoundingClientRect();
    const b = document.querySelector(".site-header__subbar").getBoundingClientRect();
    return { left: b.left, width: b.width, vw: document.documentElement.clientWidth, gap: b.top - h.bottom };
  });
  ok("bar spans the full width", geo.left === 0 && Math.abs(geo.width - geo.vw) < 1, JSON.stringify(geo));
  ok("bar sits flush under the header", Math.abs(geo.gap) <= 1, JSON.stringify(geo));
  const items = await header.locator(".site-header__subbar a").evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size);
  ok("subcategories sit in one row", items === 1, `rows=${items}`);
  await header.locator(".site-header__subbar a").first().hover();
  await page.waitForTimeout(300);
  ok("pointer can travel into the bar", (await header.locator(".site-header__subbar").count()) === 1);
  await header.getByRole("link", { name: "Coaches", exact: true }).hover();
  await page.waitForTimeout(80);
  ok("hovering the other menu swaps at once", (await header.locator(".site-header__subbar").count()) === 1 &&
    (await header.locator(".site-header__subbar a").allTextContents()).includes("Dressage"));
  await page.mouse.move(640, 700);
  await page.waitForTimeout(400);
  ok("leaving closes the bar", (await header.locator(".site-header__subbar").count()) === 0);

  await hc.click();
  const hcPanel = header.locator(".site-header__subbar");
  await hcPanel.waitFor({ state: "visible", timeout: 3000 });
  const hcLinks = await hcPanel.locator("a").allTextContents();
  ok("horse care opens with 9 links", hcLinks.length === 9, hcLinks.join(", "));
  ok("horse care includes Farriers + All horse care", hcLinks.includes("Farriers") && hcLinks.includes("All horse care"));
  ok("aria-expanded true when open", (await hc.getAttribute("aria-expanded")) === "true");

  // panel must be readable, not transparent over the hero photo
  const bg = await hcPanel.evaluate((el) => getComputedStyle(el).backgroundColor);
  const opaque = /rgba?\(([^)]+)\)/.exec(bg);
  const alpha = opaque ? Number(opaque[1].split(",")[3] ?? 1) : 1;
  ok("panel has a near-opaque surface", alpha >= 0.9, bg);

  // clicking the other menu swaps, does not stack
  await co.click();
  const panels = await header.locator(".site-header__subbar").count();
  const coLinks = await header.locator(".site-header__subbar a").allTextContents();
  ok("only one panel open at a time", panels === 1, `panels=${panels}`);
  ok("coaches opens with 9 links", coLinks.length === 9, coLinks.join(", "));
  ok("coaches lists disciplines + All disciplines", coLinks.includes("Dressage") && coLinks.includes("All disciplines"));

  // Escape closes and returns focus to the button
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  ok("Escape closes", (await header.locator(".site-header__subbar").count()) === 0);
  ok("Escape restores focus to the button", await co.evaluate((el) => el === document.activeElement));

  // outside click closes
  await co.click();
  await page.waitForTimeout(100);
  await page.mouse.click(640, 700);
  await page.waitForTimeout(150);
  ok("outside click closes", (await header.locator(".site-header__subbar").count()) === 0);

  // keyboard: open with Enter, Tab reaches the first link
  await co.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  await page.keyboard.press("Tab");
  const focusedHref = await page.evaluate(() => document.activeElement?.getAttribute("href"));
  ok("Tab from button reaches first menu link", focusedHref === "/disciplines/dressage", String(focusedHref));

  // a link actually navigates
  await page.keyboard.press("Enter");
  await page.waitForURL("**/disciplines/dressage", { timeout: 5000 });
  ok("menu link navigates", page.url().endsWith("/disciplines/dressage"));

  // and the coaches section gets its own nav back
  const navText = await page.locator("header.site-header").innerText();
  ok("coach route shows coach nav, not parent nav", navText.includes("For coaches") && !navText.includes("Horse care"), navText.replace(/\n/g, " | "));

  ok("no console errors (desktop)", errors.length === 0, errors.slice(0, 2).join(" / "));
  await page.close();
}

// ── phone ──────────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && !/ERR_TUNNEL_CONNECTION_FAILED|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  // Outbound image hosts (the mock coaches' Unsplash photos) are blocked in
  // some sandboxes; that is the environment, not the page.
  page.on("requestfailed", (r) => {
    const host = new URL(r.url()).host;
    if (!host.includes("unsplash")) errors.push(`request failed: ${r.url()}`);
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "networkidle" });

  await page.locator("header.site-header button.site-header__burger").click();
  const menu = page.locator(".site-header__menu");
  await menu.waitFor({ state: "visible", timeout: 3000 });
  const text = await menu.innerText();
  ok("phone menu has both headings", /HORSE CARE/i.test(text) && /COACHES/i.test(text), text.replace(/\n/g, " | ").slice(0, 160));
  ok("phone menu has About", /About/.test(text));
  ok("phone menu drops the coach CTA", !/List your profile/.test(text));
  const links = await menu.locator("a").allTextContents();
  ok("phone menu exposes every menu link", links.length >= 19, `${links.length} links`);

  // no horizontal overflow with the taller menu open
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok("no horizontal overflow at 390px", !overflow);

  ok("no console errors (phone)", errors.length === 0, errors.slice(0, 2).join(" / "));
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
// (each result is printed as it is recorded)
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
