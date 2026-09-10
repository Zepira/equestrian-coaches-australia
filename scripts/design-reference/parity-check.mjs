// App-side half of the parity harness. Opens a route of the RUNNING app at a
// frame width, and:
//   1. screenshots it (viewport + full page) into docs/design-reference/app/
//   2. dumps the same computed-style record capture-frames.mjs produces, so
//      app and canvas can be diffed with the same shape
//   3. optionally runs an assertion file: JSON array of
//        { "selector": "...", "prop": "fontSize", "expect": "54px" }
//      or { "selector": "...", "text": "Find a coach" }
//      and prints a pass/fail table, exiting non-zero on any failure.
//
// Usage:
//   node scripts/design-reference/parity-check.mjs <route> <width> [assertions.json] [--label name] [--base http://localhost:3000]
//
// Widths: 390 and 1280 are the canvas widths; anything else is allowed for
// the wider viewport matrix.

import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const OUT = join(ROOT, "docs/design-reference/app");

const args = process.argv.slice(2);
const route = args[0];
const width = Number(args[1] ?? 390);
const assertFile = args.find((a, i) => i >= 2 && a.endsWith(".json"));
const label = args.includes("--label") ? args[args.indexOf("--label") + 1] : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3000";

if (!route) {
  console.error("route required");
  process.exit(2);
}

const DUMP = () => {
  const PROPS = [
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing",
    "textTransform", "color", "backgroundColor", "backgroundImage", "borderRadius",
    "borderTopWidth", "borderTopColor", "borderBottomWidth", "borderBottomColor",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "marginTop", "marginBottom", "gap", "opacity", "backdropFilter", "boxShadow",
    "animationName", "animationDuration", "animationDelay", "animationTimingFunction",
    "animationIterationCount", "transition", "objectFit", "objectPosition", "display",
    "position", "top", "bottom", "width", "height", "aspectRatio", "textAlign", "maxWidth",
  ];
  const isLeafText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  const interesting = (el) =>
    isLeafText(el) || ["IMG", "INPUT", "SELECT", "TEXTAREA", "BUTTON", "A", "H1", "H2", "H3", "P", "FIGURE", "BLOCKQUOTE"].includes(el.tagName);
  const out = [];
  document.body.querySelectorAll("*").forEach((el) => {
    if (!interesting(el)) return;
    if (el.closest("script,style,noscript,[hidden]")) return;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).filter(Boolean).join(" ").slice(0, 80);
    const rec = {
      tag: el.tagName.toLowerCase(),
      text: text || undefined,
      placeholder: el.getAttribute("placeholder") ?? undefined,
      src: el.getAttribute("src") ?? undefined,
      box: { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      style: {},
    };
    for (const p of PROPS) rec.style[p] = cs[p];
    out.push(rec);
  });
  return { width: window.innerWidth, scrollHeight: document.documentElement.scrollHeight, elements: out };
};

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`[console.${m.type()}] ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);

  const stem = `${label}--${width}`;
  await page.screenshot({ path: join(OUT, `${stem}--viewport.png`) });

  // Reveal everything so the full-page shot shows all content (mirrors the
  // unrolled canvas capture).
  await page.evaluate(() => {
    document.querySelectorAll("[data-reveal], .reveal").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.transition = "none";
    });
  });
  await page.screenshot({ path: join(OUT, `${stem}--full.png`), fullPage: true });
  const dump = await page.evaluate(DUMP);
  dump.route = route;
  await writeFile(join(OUT, `${stem}.json`), JSON.stringify(dump, null, 1));
  console.log(`${route} @ ${width}: ${dump.elements.length} elements, ${dump.scrollHeight}px tall`);

  let failed = 0;
  if (assertFile) {
    const assertions = JSON.parse(await readFile(resolve(assertFile), "utf8"));
    const rows = [];
    for (const a of assertions) {
      const loc = page.locator(a.selector).first();
      const count = await page.locator(a.selector).count();
      if (count === 0) { rows.push([a.selector, a.prop ?? "text", a.expect ?? a.text, "(not found)", "FAIL"]); failed++; continue; }
      let actual;
      if (a.text !== undefined) actual = (await loc.innerText()).trim();
      else actual = await loc.evaluate((el, p) => getComputedStyle(el)[p], a.prop);
      const want = a.expect ?? a.text;
      const ok = a.contains ? String(actual).includes(want) : String(actual) === String(want);
      if (!ok) failed++;
      rows.push([a.selector, a.prop ?? "text", want, actual, ok ? "ok" : "FAIL"]);
    }
    const w = rows.reduce((m, r) => r.map((c, i) => Math.max(m[i] ?? 0, String(c).length)), []);
    for (const r of rows) console.log(r.map((c, i) => String(c).padEnd(Math.min(w[i], 60))).join("  "));
    console.log(`\n${rows.length - failed}/${rows.length} assertions passed`);
  }

  if (errors.length) {
    console.log("\nConsole/page errors:");
    for (const e of errors) console.log("  " + e);
  }
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
