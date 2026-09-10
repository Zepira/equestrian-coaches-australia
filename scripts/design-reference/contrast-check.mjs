// Worst-case contrast of a text element against whatever is actually painted
// behind it — photograph, gradient scrim, header plate, all composited by
// the browser. Hides the element's own text, screenshots its box, finds the
// brightest (or, for dark text, darkest) pixel, and reports the WCAG ratio
// against the element's text colour.
//
//   node scripts/design-reference/contrast-check.mjs <route> <width> <selector> [<selector> …] [--scroll N] [--base url]
//
// Exit 1 if any element falls under 4.5:1.

import { chromium } from "playwright";
// "load", then up to 8s of network quiet — a page with a live map or a
// long-polling dev connection never reaches a strict networkidle.
const settle = (pg) => pg.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});


const args = process.argv.slice(2);
const route = "/" + String(args[0] ?? "").replace(/^[A-Za-z]:[\\/].*?(?=\/|$)/, "").replace(/^\/+/, "");
const width = Number(args[1]);
const selectors = args.slice(2).filter((a) => !a.startsWith("--") && a !== args[args.indexOf("--scroll") + 1] && a !== args[args.indexOf("--base") + 1] && a !== args[args.indexOf("--login") + 1]);
const scrollY = args.includes("--scroll") ? Number(args[args.indexOf("--scroll") + 1]) : 0;
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3000";
// --login email:password — sign in through /login first (dashboard, account).
const login = args.includes("--login") ? args[args.indexOf("--login") + 1] : null;

const lum = ([r, g, b]) => {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [Math.max(a, b), Math.min(a, b)];
  return (hi + 0.05) / (lo + 0.05);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 800 } });
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
if (scrollY) {
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(600);
}

let failed = 0;
for (const sel of selectors) {
  const el = page.locator(sel).first();
  if ((await el.count()) === 0) {
    console.log(`${sel}: not found`);
    failed++;
    continue;
  }
  await el.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(300);
  const info = await el.evaluate((node) => {
    const cs = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    // Tailwind v4 opacity modifiers compute to color-mix()/oklab strings; let
    // the canvas normalise whatever syntax it is to rgba().
    // Chrome serialises modern syntaxes (oklab(), color(srgb …)) verbatim,
    // so don't parse the string — paint it over black and over white and
    // read the pixels back: the difference gives alpha, black gives the rgb.
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const probe = (bg) => { ctx.fillStyle = bg; ctx.fillRect(0, 0, 1, 1); ctx.fillStyle = cs.color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const onB = probe("#000"), onW = probe("#fff");
    const alpha = Math.max(0, Math.min(1, 1 - (onW[0] + onW[1] + onW[2] - onB[0] - onB[1] - onB[2]) / (3 * 255)));
    const m = [...(alpha > 0 ? onB.map((c) => Math.min(255, Math.round(c / alpha))) : [0, 0, 0]), Number(alpha.toFixed(3))];
    // Sample the content box only: a pill's own hairline border and padding
    // are inside the bounding box but never behind the glyphs.
    const px = (v) => parseFloat(v) || 0;
    const l = px(cs.borderLeftWidth) + px(cs.paddingLeft), t = px(cs.borderTopWidth) + px(cs.paddingTop);
    const rr = px(cs.borderRightWidth) + px(cs.paddingRight), b = px(cs.borderBottomWidth) + px(cs.paddingBottom);
    return { box: { x: r.left + l, y: r.top + t, w: r.width - l - rr, h: r.height - t - b }, color: m.slice(0, 3), alpha: m[3] ?? 1, fontSize: cs.fontSize, weight: cs.fontWeight, text: node.textContent.trim().slice(0, 40) };
  });
  // Hide the text (keep layout), shoot the box, restore.
  await el.evaluate((node) => {
    node.dataset.prevColor = node.style.color;
    node.style.transition = "none";
    node.style.color = "transparent";
    node.style.textShadow = "none";
    node.querySelectorAll("*").forEach((c) => { c.style.transition = "none"; c.style.color = "transparent"; });
  });
  await page.waitForTimeout(80);
  const buf = await page.screenshot({ clip: { x: info.box.x, y: info.box.y, width: Math.max(1, info.box.w), height: Math.max(1, info.box.h) } });
  await el.evaluate((node) => {
    node.style.color = node.dataset.prevColor || "";
    node.style.transition = "";
    node.querySelectorAll("*").forEach((c) => { c.style.transition = ""; c.style.color = ""; });
  });
  const textIsLight = lum(info.color) > 0.4;
  const worst = await page.evaluate(
    async ([dataUrl, light]) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let best = null;
      let bestL = light ? -1 : 2;
      for (let i = 0; i < d.length; i += 4) {
        const f = (v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        const L = 0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2]);
        if (light ? L > bestL : L < bestL) {
          bestL = L;
          best = [d[i], d[i + 1], d[i + 2]];
        }
      }
      return best;
    },
    [`data:image/png;base64,${buf.toString("base64")}`, textIsLight]
  );
  // Translucent text (e.g. text-ink-fg/70) paints as a blend with what is behind it.
  const painted = info.alpha < 1 ? info.color.map((c, i) => Math.round(c * info.alpha + worst[i] * (1 - info.alpha))) : info.color;
  const r = ratio(lum(painted), lum(worst));
  // WCAG AA: 4.5:1 for normal text, 3:1 for large text (≥ 24px, or ≥ 18.66px bold).
  const px = parseFloat(info.fontSize);
  const large = px >= 24 || (px >= 18.66 && Number(info.weight) >= 700);
  const ok = r >= (large ? 3 : 4.5);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${r.toFixed(2)}:1${large ? " (large, 3:1)" : ""}  ${sel}  "${info.text}" ${info.fontSize} text rgb(${info.color.slice(0, 3)}) vs worst-case bg rgb(${worst})`);
}
await browser.close();
process.exit(failed ? 1 : 0);
