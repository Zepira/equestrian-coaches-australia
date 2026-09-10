// Behaviour checks for the homepage that computed-style assertions can't
// express: scroll-driven reveal/parallax, the cycling headline word, the
// live search card, horizontal overflow across the viewport matrix,
// reduced motion, and LCP hygiene. Prints ok/FAIL rows, exits 1 on any FAIL.
//
//   node scripts/design-reference/home-behaviour.mjs [--base http://localhost:3000]

import { chromium } from "playwright";

const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3000";
let failed = 0;
const row = (ok, label, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`);
};

const browser = await chromium.launch();

// ── 1. reveal + parallax + wordcycle at 390 ────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const initial = await page.evaluate(() =>
    [...document.querySelectorAll("[data-reveal]")].map((el) => ({
      state: el.dataset.reveal,
      opacity: getComputedStyle(el).opacity,
      transform: getComputedStyle(el).transform,
    }))
  );
  row(initial.length >= 3, `reveal blocks present (${initial.length})`);
  row(
    initial.every((r) => r.state === "" || r.state === "true"),
    "reveal blocks start hidden (data-reveal unset) below the fold",
    JSON.stringify(initial.map((r) => r.state))
  );
  row(initial.every((r) => r.opacity === "0"), "reveal blocks start at opacity 0", initial.map((r) => r.opacity).join(","));
  row(
    initial.every((r) => r.transform === "matrix(1, 0, 0, 1, 0, 20)"),
    "reveal blocks start translated 20px",
    initial.map((r) => r.transform).join(" | ")
  );

  for (const y of [100, 300, 1200]) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(150);
    const t = await page.evaluate(() => document.querySelector("[data-parallax]").style.transform);
    const expected = Math.round(Math.min(y * 0.28, 260) * 100) / 100;
    row(Math.abs(parseFloat(t.match(/,\s*([\d.]+)px/)[1]) - expected) < 0.01, `parallax at scrollY ${y} = ${expected}px`, t);
  }

  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(1200);
  const afterScroll = await page.evaluate(() =>
    [...document.querySelectorAll("[data-reveal]")].map((el) => ({
      state: el.dataset.reveal,
      opacity: getComputedStyle(el).opacity,
      top: el.getBoundingClientRect().top,
    }))
  );
  const onScreen = afterScroll.filter((r) => r.top < 700);
  row(onScreen.length > 0 && onScreen.every((r) => r.state === "in" && r.opacity === "1"), "reveal blocks scrolled into view flip to data-reveal=in / opacity 1", JSON.stringify(onScreen));

  // wordcycle: the visible word at 1s, 3s, 5s after load should step
  // dressage → western → liberty
  await page.reload({ waitUntil: "networkidle" });
  const visibleAt = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".hero__cycle > span")]
        .map((s) => ({ t: s.textContent, o: parseFloat(getComputedStyle(s).opacity) }))
        .sort((a, b) => b.o - a.o)[0].t
    );
  const seq = [];
  for (const t of [1000, 3000, 5000]) {
    await page.waitForTimeout(t - (seq.length ? [1000, 3000, 5000][seq.length - 1] : 0));
    seq.push(await visibleAt());
  }
  row(seq.join(" → ") === "dressage. → western. → liberty.", "wordcycle sequence", seq.join(" → "));
  await page.close();
}

// ── 2. live search card ────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const input = page.locator(".hero__search input");
  await input.fill("Bend");
  await page.waitForTimeout(700);
  const chips = await page.locator(".hero__search [role=option]").allTextContents();
  row(chips.some((c) => c === "Bendigo VIC"), "typing 'Bend' offers a Bendigo VIC chip", chips.join(", "));
  row(chips.length <= 3, "at most three chips", String(chips.length));
  await page.locator(".hero__search [role=option]", { hasText: "Bendigo VIC" }).first().click();
  await page.waitForTimeout(900);
  const cta = await page.locator(".hero__search button[type=submit]").innerText();
  const m = cta.match(/^Show (\d+) near Bendigo$/);
  row(!!m, "CTA reads 'Show N near Bendigo' after picking", cta);
  const api = await page.evaluate(() => fetch("/api/coach-count?location=Bendigo%20VIC").then((r) => r.json()));
  row(m && Number(m[1]) === api.count, `CTA count matches /api/coach-count (${api.count})`);
  const chipsAfter = await page.locator(".hero__search [role=option]").count();
  row(chipsAfter === 0, "chips clear once a town is chosen", String(chipsAfter));
  await page.locator(".hero__search select").selectOption("dressage");
  await page.waitForTimeout(900);
  const cta2 = await page.locator(".hero__search button[type=submit]").innerText();
  const api2 = await page.evaluate(() => fetch("/api/coach-count?location=Bendigo%20VIC&d=dressage").then((r) => r.json()));
  row(cta2 === `Show ${api2.count} near Bendigo`, "count re-queries when discipline changes", `${cta2} vs ${api2.count}`);
  await Promise.all([page.waitForURL(/\/search\?/), page.locator(".hero__search button[type=submit]").click()]);
  const url = new URL(page.url());
  row(url.searchParams.get("location") === "Bendigo VIC" && url.searchParams.get("d") === "dressage", "submit navigates to /search with location + d", url.search);
  await page.close();
}

// ── 3. viewport matrix: no horizontal scroll, header legible, hero intact ─
for (const [w, h] of [[320, 568], [375, 667], [390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1600, 700], [1920, 1080], [2560, 1440]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const r = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    heroH: document.querySelector(".hero").getBoundingClientRect().height,
    searchBottom: document.querySelector(".hero__search").getBoundingClientRect().bottom,
    h1Top: document.querySelector(".hero__h1").getBoundingClientRect().top,
    headerH: document.querySelector("header").getBoundingClientRect().height,
  }));
  row(!r.overflow, `${w}x${h}: no horizontal scroll`);
  row(r.searchBottom <= h + 1, `${w}x${h}: search card above the fold`, `bottom ${Math.round(r.searchBottom)} / hero ${Math.round(r.heroH)}`);
  row(r.h1Top > r.headerH, `${w}x${h}: headline clear of the header`, `h1 top ${Math.round(r.h1Top)} header ${r.headerH}`);
  await page.close();
}

// ── 4. reduced motion ──────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({
    rise: getComputedStyle(document.querySelector(".rise-word")).animationDuration,
    cycle: getComputedStyle(document.querySelector(".hero__cycle > span")).animationDuration,
    marquee: getComputedStyle(document.querySelector(".marquee")).animationDuration,
    visibleWords: [...document.querySelectorAll(".hero__cycle > span")].filter((s) => getComputedStyle(s).opacity === "1").length,
    h1Opacity: getComputedStyle(document.querySelector(".rise-word")).opacity,
    parallax: document.querySelector("[data-parallax]").style.transform,
  }));
  const tiny = (v) => parseFloat(v) * (v.endsWith("ms") ? 1 : 1000) <= 0.02;
  row(tiny(r.rise) && tiny(r.cycle) && tiny(r.marquee), "reduced motion: animations collapsed to ≤0.01ms", JSON.stringify(r));
  row(r.h1Opacity === "1", "reduced motion: headline words visible");
  row(r.parallax === "", "reduced motion: no parallax transform");
  await ctx.close();
}

// ── 5. no-JS ────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  const ops = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].map((el) => getComputedStyle(el).opacity));
  row(ops.every((o) => o === "1"), "no-JS: reveal content visible", ops.join(","));
  await ctx.close();
}

// ── 6. LCP hygiene ──────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const heroReqs = [];
  page.on("request", (q) => {
    if (q.url().includes("/hero/")) heroReqs.push(q.url().split("/").pop());
  });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const img = await page.evaluate(() => {
    const i = document.querySelector(".hero__img");
    return { fp: i.getAttribute("fetchpriority"), loading: i.getAttribute("loading"), src: i.currentSrc.split("/").pop() };
  });
  row(heroReqs.length === 1, "exactly one hero image fetched", heroReqs.join(", "));
  row(img.fp === "high" && img.loading === "eager", "hero img fetchpriority=high loading=eager");
  row(/\.avif$/.test(img.src), "AVIF served to Chromium", img.src);
  await page.close();
}

await browser.close();
console.log(failed ? `\n${failed} FAIL` : "\nall ok");
process.exit(failed ? 1 : 0);
