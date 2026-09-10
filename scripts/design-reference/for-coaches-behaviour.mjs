// Behaviour checks for /for-coaches (canvas 2a/2b): the seven rising words
// and their delays, the promise ticker, Monthly/Yearly flipping every
// price + alt line, the phone comparison fold, FAQ open/close with
// aria-expanded (first open by default, one at a time), CTAs resolve, the
// #included anchor, hero contrast. Exits 1 on any FAIL.
//   node scripts/design-reference/for-coaches-behaviour.mjs [--base url]
import { chromium } from "playwright";

const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3000";
const settle = (pg) => pg.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
let failed = 0;
const row = (ok, label, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`);
};
const browser = await chromium.launch();

for (const width of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 800 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(base + "/for-coaches", { waitUntil: "load" });
  await settle(page);
  await page.waitForTimeout(1500);
  const W = `${width}:`;

  const words = await page.locator(".rise-word").evaluateAll((els) => els.map((e) => [e.textContent, getComputedStyle(e).animationDelay]));
  row(words.map((w) => w[0]).join(" ") === "You'll know exactly what your listing did.", `${W} seven rising words`, words.map((w) => w[0]).join(" "));
  row(words.map((w) => w[1]).join(",") === "0.15s,0.22s,0.29s,0.36s,0.43s,0.5s,0.57s", `${W} rise delays step 70ms`, words.map((w) => w[1]).join(","));
  row(words[2][0] === "exactly", `${W} "exactly" is the emphasised word`);
  row((await page.locator(".marquee--slow").count()) === 1, `${W} promise ticker present`);
  const heroImg = await page.evaluate(() => { const i = document.querySelector(".hero__img"); return { src: i?.currentSrc.split("/").pop(), fp: i?.getAttribute("fetchpriority") }; });
  row(/for-coaches-\d+\.(avif|webp|jpg)/.test(heroImg.src ?? ""), `${W} hero serves the for-coaches ladder`, heroImg.src);

  // plans toggle
  const price = (tier) => page.locator(`#plans [data-tier=${tier}] [data-price]`).innerText();
  const alt = (tier) => page.locator(`#plans [data-tier=${tier}] [data-alt]`).innerText();
  row((await price("listed")) === "$9.99" && (await price("spotlight")) === "$24.95" && (await price("clinic")) === "$49.95", `${W} monthly prices`);
  await page.locator("#plans [role=group] button").nth(1).click();
  await page.waitForTimeout(150);
  row((await price("listed")) === "$99" && (await price("spotlight")) === "$249" && (await price("clinic")) === "$499", `${W} yearly prices after toggle`);
  row((await alt("listed")) === "a year · or $9.99/mo", `${W} alt line flips`, await alt("listed"));
  row((await page.locator("#plans [role=group] button").nth(1).getAttribute("aria-pressed")) === "true", `${W} Yearly pressed`);
  await page.locator("#plans [role=group] button").nth(0).click();
  await page.waitForTimeout(150);
  row((await price("listed")) === "$9.99", `${W} back to monthly`);

  if (width < 1100) {
    const fold = page.locator("#plans button[aria-controls=plan-comparison]");
    row((await fold.getAttribute("aria-expanded")) === "false" && (await page.locator("#plan-comparison").count()) === 0, `${W} comparison folded by default`);
    await fold.click();
    await page.waitForTimeout(200);
    const rows = await page.locator("#plan-comparison > div").count();
    row((await fold.getAttribute("aria-expanded")) === "true" && rows === 28, `${W} unfolds to header + 27 rows`, String(rows));
    await fold.click();
    await page.waitForTimeout(200);
    row((await page.locator("#plan-comparison").count()) === 0, `${W} folds again`);
  } else {
    const rows = await page.locator("#plans [role=table] [role=row]").count();
    row(rows === 28, `${W} desktop table has header + 27 rows`, String(rows));
    const ticks = await page.locator("#plans [role=table] [aria-label=Included]").count();
    row(ticks === 11 * 3 + 11 * 2 + 5, `${W} tick count = 11×3 + 11×2 + 5`, String(ticks));
  }

  // FAQ
  const buttons = page.locator("h3 button[aria-expanded]");
  const n = await buttons.count();
  row(n === 8, `${W} eight FAQ items`, String(n));
  const opened = await page.locator("h3 button[aria-expanded=true]").count();
  row(opened === 1 && (await buttons.nth(0).getAttribute("aria-expanded")) === "true", `${W} first FAQ open by default`);
  await buttons.nth(2).click();
  await page.waitForTimeout(150);
  row((await page.locator("h3 button[aria-expanded=true]").count()) === 1 && (await buttons.nth(2).getAttribute("aria-expanded")) === "true", `${W} opening another closes the first`);
  const panelId = await buttons.nth(2).getAttribute("aria-controls");
  row((await page.locator(`[id="${panelId}"]`).count()) === 1 && (await page.locator(`[id="${panelId}"]`).isVisible()), `${W} panel visible and linked by aria-controls`);
  await buttons.nth(2).click();
  await page.waitForTimeout(150);
  row((await page.locator("h3 button[aria-expanded=true]").count()) === 0, `${W} clicking the open one closes it`);
  row((await buttons.nth(2).evaluate((b) => b.querySelector("span:last-child").textContent)) === "+", `${W} control reads + when closed`);

  // anchors + CTAs
  const ctas = await page.locator("a[href^='/signup?role=coach']").count();
  row(ctas >= 5, `${W} coach signup CTAs present (${ctas})`);
  await page.locator(".hero__col a[href='#included']").click();
  await page.waitForTimeout(600);
  const incTop = await page.locator("#included").evaluate((el) => el.getBoundingClientRect().top);
  row(incTop >= 0 && incTop < 200, `${W} "See what's included" scrolls to #included`, `top=${Math.round(incTop)}`);
  row(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), `${W} no horizontal scroll`);
  row(errs.length === 0, `${W} no page errors / 4xx`, errs.slice(0, 3).join(" | "));
  await page.close();
}

await browser.close();
console.log(failed ? `\n${failed} FAIL` : "\nall ok");
process.exit(failed ? 1 : 0);
