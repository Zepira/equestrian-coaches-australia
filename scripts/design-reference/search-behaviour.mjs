// Behaviour checks for /search (canvas: Search Results): chips ↔ URL ↔
// result count (cross-checked against the RPC-backed count API), radius
// slider, list/map toggle, pin ↔ card selection, marker count, tile
// loading, and keyboard reach. Exits 1 on any FAIL.
//
//   node scripts/design-reference/search-behaviour.mjs [--base http://localhost:3000]

import { chromium } from "playwright";
// "load", then up to 8s of network quiet — a page with a live map or a
// long-polling dev connection never reaches a strict networkidle.
const settle = (pg) => pg.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});


const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3000";
let failed = 0;
const row = (ok, label, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`);
};
const browser = await chromium.launch();
const START = "/search?location=Bendigo+VIC&d=dressage";

// ── desktop ─────────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const tiles = [];
  page.on("response", (r) => {
    if (r.url().includes("tiles.openfreemap.org")) tiles.push(r.status());
  });
  await page.goto(base + START, { waitUntil: "load" }); await settle(page);
  await page.waitForTimeout(1500);

  const countOf = async () => Number((await page.locator("h1").first().innerText()).match(/^(\d+)/)?.[1] ?? -1);
  const cards = async () => page.locator(".grid-cols-2 > a[href^='/coaches/']").count();
  const n0 = await countOf();
  row(n0 === (await cards()), `h1 count equals rendered cards (${n0})`);
  const api = await page.evaluate(() => fetch("/api/coach-count?location=Bendigo%20VIC&d=dressage").then((r) => r.json()));
  row(n0 === api.count, `count equals /api/coach-count at 50 km (${api.count})`);

  // chips → URL + count
  await Promise.all([page.waitForURL(/a=horses-available/), page.getByRole("button", { name: "Horses available" }).click()]);
  await page.waitForTimeout(800);
  const n1 = await countOf();
  row(page.url().includes("a=horses-available"), "chip toggles the `a` param", page.url().split("?")[1]);
  row(n1 <= n0, `filtering narrows or keeps the count (${n0} → ${n1})`);
  row((await page.getByRole("button", { name: "Horses available" }).getAttribute("aria-pressed")) === "true", "chip shows pressed");
  await Promise.all([page.waitForURL((u) => !u.href.includes("a=horses-available")), page.getByRole("button", { name: "Horses available" }).click()]);
  await page.waitForTimeout(800);
  row((await countOf()) === n0, "toggling the chip off restores the count");

  await Promise.all([page.waitForURL(/new=1/), page.getByRole("button", { name: "Taking new students" }).click()]);
  await page.waitForTimeout(800);
  const n2 = await countOf();
  row(n2 <= n0, `taking-new-students filter narrows (${n0} → ${n2})`);
  await Promise.all([page.waitForURL((u) => !u.href.includes("new=1")), page.getByRole("button", { name: "Taking new students" }).click()]);
  await page.waitForTimeout(800);

  // radius
  // the VISIBLE slider — the phone copy is display:none at this width
  const slider = page.locator("input[type=range]:visible").first();
  await slider.focus();
  await Promise.all([page.waitForURL(/r=150/), slider.evaluate((el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "150"); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); })]);
  await page.waitForTimeout(1000);
  const n150 = await countOf();
  row(page.url().includes("r=150"), "slider writes r=150 to the URL");
  row(n150 >= n0, `150 km finds at least as many as 50 km (${n0} → ${n150})`);
  await Promise.all([page.waitForURL(/r=25/), slider.evaluate((el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "25"); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); })]);
  await page.waitForTimeout(1000);
  const n25 = await countOf();
  row(n25 <= n0, `25 km finds no more than 50 km (${n0} → ${n25})`);
  await page.goto(base + START, { waitUntil: "load" }); await settle(page);
  await page.waitForTimeout(2500);

  // map + pins
  const pins = await page.locator(".map-pin").count();
  row(pins === (await cards()), `one map pin per result (${pins})`);
  row((await page.locator(".map-origin").count()) === 1, "origin dot present");
  row(tiles.length > 0 && tiles.every((s) => s === 200), `vector tiles / style loaded from OpenFreeMap (${tiles.length} responses)`);
  const canvas = await page.locator(".maplibregl-canvas").count();
  row(canvas === 1, "MapLibre canvas mounted");

  // hover card → pin active
  const second = page.locator(".grid-cols-2 > a[href^='/coaches/']").nth(1);
  await second.hover();
  await page.waitForTimeout(300);
  const secondSlug = (await second.getAttribute("href")).split("/").pop();
  row((await second.getAttribute("data-active")) === "true", "hovered card becomes active");
  const activePins = await page.locator(".map-pin[data-active=true]").count();
  row(activePins === 1, "exactly one active pin after hover");
  // click a DIFFERENT coach's pin → its card active (pins may overlap when
  // two coaches share a town, so pick by slug, not by position)
  const otherSlug = (await page.locator(".grid-cols-2 > a[href^='/coaches/']").nth(0).getAttribute("href")).split("/").pop();
  await page.locator(`.map-pin[data-slug="${otherSlug}"]`).evaluate((el) => el.click());
  await page.waitForTimeout(300);
  const activeCard = await page.locator(".grid-cols-2 > a[data-active=true]").getAttribute("href");
  row(Boolean(activeCard) && activeCard.split("/").pop() === otherSlug && otherSlug !== secondSlug, "clicking a pin moves the selection", activeCard ?? "(none)");
  const overlay = await page.locator(".sticky.top-\\[72px\\] a[href^='/coaches/']").getAttribute("href");
  row(overlay === activeCard, "map overlay card shows the selected coach");

  // keyboard reach
  const focusable = await page.evaluate(() =>
    [...document.querySelectorAll("[role=group][aria-label=Filters] button, input[type=range], .grid-cols-2 > a, .map-pin")].every(
      (el) => el.tabIndex >= 0
    )
  );
  row(focusable, "chips, slider, cards and pins are keyboard reachable");
  row((await slider.getAttribute("aria-label")) === "Search radius in kilometres", "slider has a label");
  await page.close();
}

// ── phone ───────────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base + START, { waitUntil: "load" }); await settle(page);
  await page.waitForTimeout(1200);
  row((await page.locator("header [role=group][aria-label=Filters]").count()) === 1, "phone: chips live in the sticky ink header");
  const toggle = page.locator("main .sticky > button");
  row((await toggle.innerText()).trim() === "Map", "phone: floating toggle reads Map");
  // At the top of the page the toggle's natural spot (after the list) is
  // below the fold, so sticky pins it 18px above the viewport bottom.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const box = await toggle.boundingBox();
  row(box && Math.abs(box.y + box.height - (844 - 18)) <= 2, "phone: toggle pinned 18px above the fold at the top of the page", `bottom=${Math.round((box?.y ?? 0) + (box?.height ?? 0))}`);
  await toggle.click();
  await page.waitForTimeout(2500);
  row((await toggle.innerText()).trim() === "List", "phone: toggle flips to List");
  row((await page.locator(".maplibregl-canvas").count()) === 1, "phone: map view mounts the canvas");
  row((await page.locator(".map-pin").count()) > 0, "phone: pins plotted");
  row((await page.locator(".maplibregl-map").count()) === 1, "phone: exactly one map instance (desktop column not mounted)");
  await page.screenshot({ path: "docs/design-reference/app/search--390--map-view.png" });
  const before = page.url();
  await toggle.click();
  await page.waitForTimeout(500);
  row(page.url() === before && (await page.locator("main a[href^='/coaches/']").count()) > 0, "phone: back to list keeps URL and results");
  row(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "phone: no horizontal scroll");
  await page.close();
}

await browser.close();
console.log(failed ? `\n${failed} FAIL` : "\nall ok");
process.exit(failed ? 1 : 0);
