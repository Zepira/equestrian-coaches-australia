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
// "load", then up to 8s of network quiet — a page with a live map or a
// long-polling dev connection never reaches a strict networkidle.
const settle = (pg) => pg.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const OUT = join(ROOT, "docs/design-reference/app");

const args = process.argv.slice(2);
// Git Bash on Windows rewrites a leading "/" argument into a filesystem
// path; accept the route with or without it (and strip such a rewrite).
const route = "/" + String(args[0] ?? "").replace(/^[A-Za-z]:[\/].*?(?=\/|$)/, "").replace(/^\/+/, "");
const width = Number(args[1] ?? 390);
const assertFile = args.find((a, i) => i >= 2 && a.endsWith(".json"));
const label = args.includes("--label") ? args[args.indexOf("--label") + 1] : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3000";
// --login email:password — sign in through the real /login form first, for
// auth-gated routes (dashboard, account).
const login = args.includes("--login") ? args[args.indexOf("--login") + 1] : null;

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
  page.on("console", (m) => {
    // Headless Chromium's GPU driver chatter on a WebGL map is not a page error.
    if (/GL Driver Message|WebGL-0x/.test(m.text())) return;
    if (m.type() === "error" || m.type() === "warning") errors.push(`[console.${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.url()}`); });

  if (login) {
    const [email, password] = login.split(":");
    await page.goto(base + "/login", { waitUntil: "load" });
    await page.locator("input[type=email], input[name=email]").first().fill(email);
    await page.locator("input[type=password]").first().fill(password);
    await page.locator("form button[type=submit]").first().click();
    await page.waitForTimeout(3000);
  }
  await page.goto(base + route, { waitUntil: "load" }); await settle(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  // A page with a map needs its style + fitBounds animation to finish
  // before the screenshot means anything.
  if ((await page.locator(".maplibregl-map").count()) > 0) await page.waitForTimeout(3000);

  const stem = `${label}--${width}`;
  await page.screenshot({ path: join(OUT, `${stem}--viewport.png`) });

  // Reveal everything so the full-page shot shows all content (mirrors the
  // unrolled canvas capture).
  await page.evaluate(() => {
    document.querySelectorAll("[data-reveal], .reveal").forEach((el) => {
      el.dataset.prevStyle = el.getAttribute("style") ?? "";
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.transition = "none";
    });
  });
  await page.screenshot({ path: join(OUT, `${stem}--full.png`), fullPage: true });
  // Put the reveal styles back so the dump and the assertions below see the
  // page's real transitions, not the screenshot override.
  await page.evaluate(() => {
    document.querySelectorAll("[data-reveal], .reveal").forEach((el) => {
      if (el.dataset.prevStyle) el.setAttribute("style", el.dataset.prevStyle);
      else el.removeAttribute("style");
      el.dataset.reveal = "in";
    });
  });
  const dump = await page.evaluate(DUMP);
  dump.route = route;
  await writeFile(join(OUT, `${stem}.json`), JSON.stringify(dump, null, 1));
  console.log(`${route} @ ${width}: ${dump.elements.length} elements, ${dump.scrollHeight}px tall`);

  let failed = 0;
  if (assertFile) {
    const assertions = JSON.parse(await readFile(resolve(assertFile), "utf8"));
    const rows = [];
    for (const a of assertions) {
      const all = page.locator(a.selector);
      const count = await all.count();
      // First VISIBLE match — responsive twins (`hidden wide:inline`) mean
      // the first DOM match can be the one display:none'd at this width.
      let loc = all.first();
      for (let i = 0; i < count; i++) {
        const cand = all.nth(i);
        if (await cand.evaluate((el) => el.getClientRects().length > 0)) { loc = cand; break; }
      }
      // `absent: true` — no VISIBLE match at this width (hidden wrappers keep
      // their children's own computed `display`, so check rendering instead).
      if (a.absent) {
        let visible = 0;
        for (let i = 0; i < count; i++) if (await all.nth(i).evaluate((el) => el.getClientRects().length > 0)) visible++;
        const ok = visible === 0;
        if (!ok) failed++;
        rows.push([a.selector, "absent", "0 visible", `${visible} visible`, ok ? "ok" : "FAIL"]);
        continue;
      }
      if (count === 0) { rows.push([a.selector, a.prop ?? "text", a.expect ?? a.text, "(not found)", "FAIL"]); failed++; continue; }
      let actual;
      // textContent, not innerText: innerText applies text-transform, and the
      // canvases write eyebrows in sentence case + CSS uppercase.
      if (a.text !== undefined)
        actual = (
          await loc.evaluate((el) => {
            // Visible text nodes only (skips display:none responsive twins).
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            let out = "";
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              const p = n.parentElement;
              if (p && p.getClientRects().length > 0) out += n.textContent;
            }
            return out;
          })
        )
          .replace(/\s+/g, " ")
          .trim();
      else actual = await loc.evaluate((el, p) => getComputedStyle(el)[p], a.prop);
      let want = a.expect ?? a.text;
      // Colours: Tailwind v4 emits oklab()/color-mix() for opacity modifiers,
      // which paint identically to the canvas's rgba(). Compare the pixel
      // a browser actually paints, not the string.
      if (a.prop && /color/i.test(a.prop) && a.text === undefined) {
        const toRgba = (v) => page.evaluate((val) => {
          const c = document.createElement("canvas"); c.width = c.height = 1;
          const ctx = c.getContext("2d"); ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = val; ctx.fillRect(0, 0, 1, 1);
          const [r, g, b, al] = ctx.getImageData(0, 0, 1, 1).data;
          return `rgba(${r}, ${g}, ${b}, ${(al / 255).toFixed(2)})`;
        }, v);
        actual = await toRgba(actual);
        want = await toRgba(want);
      }
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
