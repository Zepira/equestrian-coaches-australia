// Writes the horse mark as fixed-colour files for places the React component
// can't reach (emails, social avatars, print, other people's sites), plus the
// favicon and apple-touch icon. The path is read from
// src/components/brand-mark.tsx, so that file is the one source of truth.
//
//   node scripts/build-brand.mjs
//     → public/brand/horse-<colour>.svg / .png (1200px wide, transparent)
//     → public/brand/tile-<ground>.png (1024px square, mark on a ground)
//     → src/app/icon.png (512) + src/app/apple-icon.png (180)

import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const src = readFileSync(resolve(ROOT, "src/components/brand-mark.tsx"), "utf8");
const d = src.match(/BRAND_MARK_PATH =\s*"([^"]+)"/)[1];
const viewBox = src.match(/BRAND_MARK_VIEWBOX = "([^"]+)"/)[1];
const [, , vw, vh] = viewBox.split(" ").map(Number);

// Named after the token each one matches in globals.css.
const COLOURS = {
  ink: "#1f3a2e", // on cream: the default
  "ink-deep": "#14281f",
  cream: "#f6f1e7", // on ink, or over a photograph
  terracotta: "#b4553a", // coaches accent
  peach: "#e8b79a", // coaches accent on dark
  steel: "#3f6480", // farriers accent
  sky: "#a9c4da", // farriers accent on dark
  original: "#00573d", // the green in the Canva file
};

const TILES = {
  "ink-deep": { ground: "#14281f", mark: "#f6f1e7" },
  cream: { ground: "#f6f1e7", mark: "#1f3a2e" },
  terracotta: { ground: "#b4553a", mark: "#f6f1e7" },
};

const svg = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${vw}" height="${vh}"><path fill="${fill}" fill-rule="evenodd" d="${d}"/></svg>\n`;

const out = resolve(ROOT, "public/brand");
mkdirSync(out, { recursive: true });
for (const [name, hex] of Object.entries(COLOURS)) writeFileSync(resolve(out, `horse-${name}.svg`), svg(hex));

// Mark centred on a square ground. `inset` is the share of the width the
// horse spans; a wide mark needs less at small sizes or the legs vanish.
const tile = (size, ground, mark, inset, radius) => `<!doctype html><html><body style="margin:0;background:transparent">
<div id="t" style="width:${size}px;height:${size}px;background:${ground};border-radius:${radius}px;display:flex;align-items:center;justify-content:center">
<svg viewBox="${viewBox}" style="width:${Math.round(size * inset)}px;height:auto;margin-top:${Math.round(size * 0.02)}px"><path fill="${mark}" fill-rule="evenodd" d="${d}"/></svg>
</div></body></html>`;

const browser = await chromium.launch();
const shoot = async (file, w, h, html, selector) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.locator(selector).screenshot({ path: resolve(ROOT, file), omitBackground: true });
  await page.close();
  console.log(file);
};

for (const [name, hex] of Object.entries(COLOURS)) {
  const w = 1200;
  const h = Math.round((w * vh) / vw);
  await shoot(`public/brand/horse-${name}.png`, w, h, `<!doctype html><body style="margin:0">${svg(hex).replace("<svg ", `<svg id="m" style="display:block;width:${w}px;height:${h}px" `)}</body>`, "#m");
}
for (const [name, t] of Object.entries(TILES)) {
  await shoot(`public/brand/tile-${name}.png`, 1024, 1024, tile(1024, t.ground, t.mark, 0.78, 0), "#t");
}
await shoot("src/app/icon.png", 512, 512, tile(512, "#14281f", "#f6f1e7", 0.84, 92), "#t");
await shoot("src/app/apple-icon.png", 180, 180, tile(180, "#14281f", "#f6f1e7", 0.8, 0), "#t");
await browser.close();
