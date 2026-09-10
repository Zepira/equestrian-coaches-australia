// R9 whole-site sweep — the plan's final validation list, as one script:
//   • every route in the site map at 390 and 1280: HTTP status, console
//     errors, page errors, hydration warnings, horizontal overflow, header +
//     footer + <meta name=description> present
//   • logged-in routes (coach dashboard, rider account) with --coach / --rider
//   • viewport matrix (320×568 … 2560×1440) on /, /search, a coach profile
//     and /for-coaches: no overflow, the h1 inside the viewport
//   • reduced-motion: every [data-reveal] visible at once, marquee stopped
//   • no-JS: h1 + [data-reveal] content visible, the home search is a real
//     GET form
//   • LCP is the hero image on / and /for-coaches, hero payload under 200 KB,
//     every webfont loads with font-display: swap
//   • keyboard: the enquiry sheet traps focus and returns it; the
//     taking-students control moves with arrow keys; no interactive control
//     on /search is tabindex=-1
//   • sitemap lists real coaches only and robots blocks the private routes;
//     JSON-LD on coach / discipline / clinic pages parses with the right @type
//
//   node scripts/design-reference/site-sweep.mjs [--base http://localhost:3001]
//        [--coach email:pw] [--rider email:pw] [--coach-slug parity-isabella] [--clinic <uuid>]
//
// Meant to run against `next start` (production) — dev-only overlays add
// warnings production never shows. Exit 1 on any failure.
import { chromium } from "playwright";

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = opt("--base", "http://localhost:3000");
const coachLogin = opt("--coach", null);
const riderLogin = opt("--rider", null);
const coachSlug = opt("--coach-slug", "parity-isabella");
const clinicId = opt("--clinic", null);

let failed = 0;
const row = (ok, label, detail = "") => { if (!ok) failed++; console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + String(detail).slice(0, 220) : ""}`); };
const settle = (p) => p.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
const noise = (t) => /GL Driver Message|WebGL-0x|Download the React DevTools|favicon/.test(t);

const PUBLIC = [
  ["/", 200], ["/search", 200], ["/search?d=dressage&location=Bendigo+VIC", 200], ["/disciplines/dressage", 200],
  [`/coaches/${coachSlug}`, 200], ["/coaches/emma-dawson-0", 200], ["/for-coaches", 200], ["/login", 200],
  ["/signup", 200], ["/signup?role=coach", 200], ["/forgot-password", 200], ["/reset-password", 200],
  ["/riding-instructors/bendigo-vic", 200], ["/nope-404", 404],
  ...(clinicId ? [[`/clinics/${clinicId}`, 200]] : []),
];
const COACH = ["/dashboard", "/dashboard/enquiries", "/dashboard/profile", "/dashboard/clinics", "/dashboard/billing", ...(clinicId ? [`/dashboard/clinics/${clinicId}/edit`] : [])];
const RIDER = ["/account", "/account/delete"];

const browser = await chromium.launch();

async function login(ctx, creds) {
  const [email, password] = creds.split(":");
  const p = await ctx.newPage();
  await p.goto(`${base}/login`, { waitUntil: "load" }); await settle(p);
  await p.locator("input[type=email]").first().fill(email);
  await p.locator("input[type=password]").first().fill(password);
  await p.locator("form button[type=submit]").first().click();
  await p.waitForTimeout(3500);
  await p.close();
}

async function walk(ctx, routes, width, tag) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height: width < 600 ? 844 : 800 });
  for (const entry of routes) {
    const [route, expect] = Array.isArray(entry) ? entry : [entry, 200];
    const errs = [];
    // A deliberate 404 logs its own "Failed to load resource" — that is the test passing.
    const onConsole = (m) => { if ((m.type() === "error" || m.type() === "warning") && !noise(m.text()) && !(expect === 404 && /status of 404/.test(m.text()))) errs.push(`[${m.type()}] ${m.text()}`); };
    const onErr = (e) => errs.push(`[pageerror] ${e.message}`);
    page.on("console", onConsole); page.on("pageerror", onErr);
    const res = await page.goto(`${base}${route}`, { waitUntil: "load" }).catch((e) => ({ status: () => `nav: ${e.message}` }));
    await settle(page); await page.waitForTimeout(400);
    const status = res?.status?.();
    const checks = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      header: Boolean(document.querySelector("header.site-header")),
      footer: Boolean(document.querySelector("footer")),
      desc: Boolean(document.querySelector("meta[name=description]")),
      h1: document.querySelector("h1")?.textContent?.trim().slice(0, 40) ?? "",
    }));
    page.off("console", onConsole); page.off("pageerror", onErr);
    const hydration = errs.filter((e) => /hydrat|did not match|Text content does not match/i.test(e));
    const ok = status === expect && errs.length === 0 && !checks.overflow && checks.header && checks.footer && (expect !== 200 || checks.desc || route.startsWith("/dashboard") || route.startsWith("/account"));
    row(ok, `${tag} ${width} ${route}`, [status !== expect ? `status ${status}` : "", checks.overflow ? "overflow" : "", !checks.header ? "no header" : "", !checks.footer ? "no footer" : "", !checks.desc && expect === 200 ? "no description" : "", hydration.length ? "HYDRATION" : "", ...errs.slice(0, 2)].filter(Boolean).join(" | ") || checks.h1);
  }
  await page.close();
}

// ── public routes, both widths ───────────────────────────────────────────
{
  const ctx = await browser.newContext();
  await walk(ctx, PUBLIC, 390, "public");
  await walk(ctx, PUBLIC, 1280, "public");
  await ctx.close();
}
// ── logged-in routes ─────────────────────────────────────────────────────
if (coachLogin) {
  const ctx = await browser.newContext();
  await login(ctx, coachLogin);
  await walk(ctx, COACH, 390, "coach");
  await walk(ctx, COACH, 1280, "coach");
  await ctx.close();
}
if (riderLogin) {
  const ctx = await browser.newContext();
  await login(ctx, riderLogin);
  await walk(ctx, RIDER, 390, "rider");
  await walk(ctx, RIDER, 1280, "rider");
  await ctx.close();
}

// ── viewport matrix ──────────────────────────────────────────────────────
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const sizes = [[320, 568], [390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440]];
  for (const route of ["/", "/search", `/coaches/${coachSlug}`, "/for-coaches"]) {
    const bad = [];
    for (const [w, h] of sizes) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${base}${route}`, { waitUntil: "load" }); await settle(page); await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        const h1 = document.querySelector("h1")?.getBoundingClientRect();
        const hdr = document.querySelector("header.site-header")?.getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          h1Inside: h1 ? h1.left >= 0 && h1.right <= window.innerWidth + 1 : true,
          headerFits: hdr ? hdr.width <= window.innerWidth + 1 : true,
        };
      });
      if (r.overflow || !r.h1Inside || !r.headerFits) bad.push(`${w}×${h}${r.overflow ? " overflow" : ""}${!r.h1Inside ? " h1-out" : ""}${!r.headerFits ? " header" : ""}`);
    }
    row(bad.length === 0, `matrix ${route}: no overflow, h1 + header inside at ${sizes.length} sizes`, bad.join(", "));
  }
  await page.close(); await ctx.close();
}

// ── reduced motion ───────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  for (const route of ["/", "/for-coaches", `/coaches/${coachSlug}`, "/search"]) {
    await page.goto(`${base}${route}`, { waitUntil: "load" }); await settle(page);
    const r = await page.evaluate(() => {
      const reveals = [...document.querySelectorAll("[data-reveal]")];
      const hidden = reveals.filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).length;
      const marquee = document.querySelector(".marquee");
      const dur = marquee ? getComputedStyle(marquee).animationDuration : "none";
      return { total: reveals.length, hidden, dur };
    });
    row(r.hidden === 0 && (r.dur === "none" || parseFloat(r.dur) <= 0.01), `reduced-motion ${route}: ${r.total} reveals visible, marquee ${r.dur}`, r.hidden ? `${r.hidden} hidden` : "");
  }
  await page.close(); await ctx.close();
}

// ── no JavaScript ────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  for (const route of ["/", "/for-coaches", `/coaches/${coachSlug}`, "/disciplines/dressage", "/search?d=dressage&location=Bendigo+VIC"]) {
    await page.goto(`${base}${route}`, { waitUntil: "load" });
    const r = await page.evaluate((route) => {
      const reveals = [...document.querySelectorAll("[data-reveal]")];
      return {
        h1: document.querySelector("h1")?.textContent?.trim().length ?? 0,
        hidden: reveals.filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).length,
        form: route === "/" ? Boolean(document.querySelector("form[action='/search']")) : true,
        cards: document.querySelectorAll("a[href^='/coaches/']").length,
      };
    }, route);
    row(r.h1 > 0 && r.hidden === 0 && r.form, `no-js ${route}: h1, ${r.cards} coach links, reveals visible`, r.hidden ? `${r.hidden} hidden` : !r.form ? "no GET form" : "");
  }
  await page.close(); await ctx.close();
}

// ── LCP, hero payload, font-display ──────────────────────────────────────
{
  // Chrome excludes an image that covers the whole viewport from LCP (it is
  // treated as a background), and the home hero is 100svh on desktop — so
  // measure / at a phone size where the 780px hero is shorter than the
  // viewport and the photo is a real candidate. /for-coaches is 720px tall
  // at 1280×800 and measures there.
  for (const route of ["/", "/for-coaches"]) {
    const ctx = await browser.newContext({ viewport: route === "/" ? { width: 390, height: 844 } : { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__lcp = null;
      window.__lcps = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcps.push({ tag: e.element?.tagName, src: e.element?.currentSrc?.split("/").pop(), size: e.size, t: Math.round(e.startTime) }); }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.goto(`${base}${route}`, { waitUntil: "load" }); await settle(page); await page.waitForTimeout(800);
    const r = await page.evaluate(async (prefix) => {
      await document.fonts.ready;
      const hero = performance.getEntriesByType("resource").filter((e) => e.name.includes(prefix));
      const bytes = hero.reduce((n, e) => n + (e.transferSize || e.encodedBodySize || 0), 0);
      // next/font's size-adjusted fallbacks are local() faces — never fetched, so their display value is moot.
      const faces = [...document.fonts].filter((f) => !/Fallback/.test(f.family)).map((f) => f.display);
      const lcp = window.__lcps[window.__lcps.length - 1];
      return { lcp, lcps: window.__lcps, heroCount: hero.length, bytes, faces: [...new Set(faces)] };
    }, route === "/" ? "/hero/wide" : "/hero/for-coaches");
    row(r.lcp?.tag === "IMG", `LCP ${route} is the hero image`, JSON.stringify(r.lcps));
    row(r.heroCount === 1 && r.bytes > 0 && r.bytes < 200 * 1024, `hero payload ${route}: one file, ${Math.round(r.bytes / 1024)} KB < 200 KB`, `${r.heroCount} files`);
    row(r.faces.length === 1 && r.faces[0] === "swap", `fonts ${route}: every face display=swap`, r.faces.join(","));
    await page.close(); await ctx.close();
  }
}

// ── keyboard ─────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/coaches/${coachSlug}`, { waitUntil: "load" }); await settle(page);
  const opener = page.locator(".enquiry-bar button").first();
  if ((await opener.count()) > 0) {
    await opener.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(600);
    const inside = [];
    for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); inside.push(await page.evaluate(() => Boolean(document.activeElement?.closest("[role=dialog]")))); }
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    const back = await page.evaluate(() => Boolean(document.activeElement?.closest(".enquiry-bar")));
    const closed = (await page.locator("[role=dialog]").count()) === 0;
    row(inside.every(Boolean), "keyboard: enquiry sheet traps focus over 12 tabs", inside.map((b) => (b ? "·" : "X")).join(""));
    row(closed && back, "keyboard: Escape closes the sheet and returns focus to the bar", `${closed ? "closed" : "open"} / ${back ? "focus back" : "focus lost"}`);
  } else row(false, "keyboard: enquiry bar present on the coach profile");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${base}/search?d=dressage&location=Bendigo+VIC`, { waitUntil: "load" }); await settle(page);
  const neg = await page.evaluate(() => [...document.querySelectorAll("main button, main a[href], main input, main select")].filter((el) => el.tabIndex < 0 && !el.closest("[aria-hidden=true]") && el.getClientRects().length > 0).map((el) => `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ")[0] : ""}`));
  row(neg.length === 0, "keyboard: every visible control on /search is tabbable", neg.slice(0, 5).join(", "));
  await page.close(); await ctx.close();
}
if (coachLogin) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await login(ctx, coachLogin);
  const page = await ctx.newPage();
  await page.goto(`${base}/dashboard`, { waitUntil: "load" }); await settle(page);
  const radios = page.locator("[role=radiogroup]:visible [role=radio]");
  if ((await radios.count()) === 3) {
    const before = await radios.evaluateAll((els) => els.map((e) => e.getAttribute("aria-checked") === "true"));
    const from = before.indexOf(true);
    await radios.nth(from).focus();
    await page.keyboard.press("ArrowRight"); await page.waitForTimeout(300);
    const after = await radios.evaluateAll((els) => els.map((e) => e.getAttribute("aria-checked") === "true"));
    const focusedIdx = await page.evaluate(() => [...document.querySelectorAll("[role=radiogroup] [role=radio]")].filter((el) => el.getClientRects().length > 0).indexOf(document.activeElement));
    const want = (from + 1) % 3;
    row(after.indexOf(true) === want && focusedIdx === want, "keyboard: taking-students ArrowRight moves selection + focus to the next option", `${from} → ${after.indexOf(true)}, focus ${focusedIdx}`);
    // Put the coach back on "Yes" — the enquiry-sheet test and the next run depend on it.
    await radios.first().click(); await page.waitForTimeout(600);
  } else row(false, "keyboard: taking-students radiogroup present");
  await page.close(); await ctx.close();
}

// ── sitemap, robots, structured data ─────────────────────────────────────
{
  const sm = await (await fetch(`${base}/sitemap.xml`)).text();
  row(sm.includes(`/coaches/${coachSlug}`) && !sm.includes("emma-dawson-0"), "sitemap: real coach in, mock coach out");
  row(sm.includes("/disciplines/dressage") && sm.includes("/for-coaches"), "sitemap: static + discipline routes");
  const rb = await (await fetch(`${base}/robots.txt`)).text();
  row(/Disallow: \/dashboard/.test(rb) && /Disallow: \/account/.test(rb) && /Sitemap:/.test(rb), "robots: private routes disallowed, sitemap pointed");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const ld = async (route) => {
    await page.goto(`${base}${route}`, { waitUntil: "load" });
    return page.evaluate(() => [...document.querySelectorAll("script[type='application/ld+json']")].flatMap((s) => { const j = JSON.parse(s.textContent); return Array.isArray(j) ? j : [j]; }).map((j) => j["@type"]));
  };
  const coachLd = await ld(`/coaches/${coachSlug}`);
  row(coachLd.includes("Person") && coachLd.includes("BreadcrumbList"), "json-ld coach: Person + BreadcrumbList", coachLd.join(","));
  const discLd = await ld("/disciplines/dressage");
  row(discLd.includes("ItemList") && discLd.includes("BreadcrumbList"), "json-ld discipline: ItemList + BreadcrumbList", discLd.join(","));
  if (clinicId) { const cl = await ld(`/clinics/${clinicId}`); row(cl.includes("Event") && cl.includes("BreadcrumbList"), "json-ld clinic: Event + BreadcrumbList", cl.join(",")); }
  const noindex = await page.goto(`${base}/search`, { waitUntil: "load" }).then(() => page.evaluate(() => document.querySelector("meta[name=robots]")?.content ?? ""));
  row(/noindex/.test(noindex), "/search is noindex", noindex);
  await page.close(); await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} FAIL` : "\nall ok");
process.exit(failed ? 1 : 0);
