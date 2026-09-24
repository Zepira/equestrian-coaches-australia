// Writes the horse-head mark as fixed-colour files for places the React
// component can't reach (emails, social avatars, print, other people's
// sites), plus the favicon and apple-touch icon. The path is read from
// src/components/brand-mark.tsx, so that file is the one source of truth.
//
//   node scripts/build-brand.mjs
//     → public/brand/horse-<colour>.svg / .png        fine lines, 1200px tall, for 97px and up
//     → public/brand/horse-<colour>-small.svg / .png  thickened, 256px tall, for 40px and under
//     → public/brand/tile-<ground>.png                1024px square, mark on a ground (social avatars)
//     → src/app/icon.png (512) + src/app/apple-icon.png (180)
//
// The head is fine line work, so small renders carry a stroke in the fill
// colour to keep the thinnest lines visible (see markStroke in brand-mark.tsx).

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
  gold: "#dbc470", // the gold in the Canva file
};

const TILES = {
  "ink-deep": { ground: "#14281f", mark: "#f6f1e7" },
  cream: { ground: "#f6f1e7", mark: "#1f3a2e" },
  terracotta: { ground: "#b4553a", mark: "#f6f1e7" },
  original: { ground: "#163934", mark: "#dbc470" }, // the Canva file's green and gold
};

const SMALL_STROKE = 48;

const pathTag = (fill, stroke = 0) =>
  `<path fill="${fill}" fill-rule="evenodd"${stroke ? ` stroke="${fill}" stroke-width="${stroke}" stroke-linejoin="round"` : ""} d="${d}"/>`;
const svg = (fill, stroke = 0) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${vw}" height="${vh}">${pathTag(fill, stroke)}</svg>\n`;

const out = resolve(ROOT, "public/brand");
mkdirSync(out, { recursive: true });
for (const [name, hex] of Object.entries(COLOURS)) {
  writeFileSync(resolve(out, `horse-${name}.svg`), svg(hex));
  writeFileSync(resolve(out, `horse-${name}-small.svg`), svg(hex, SMALL_STROKE));
}

// Mark centred on a square ground. The head is taller than it is wide, so
// `inset` is the share of the height it fills; `stroke` thickens it for
// icons that get shrunk to 16–32px by the browser.
const tile = (size, ground, mark, inset, radius, stroke) => `<!doctype html><html><body style="margin:0;background:transparent">
<div id="t" style="width:${size}px;height:${size}px;background:${ground};border-radius:${radius}px;display:flex;align-items:center;justify-content:center">
<svg viewBox="${viewBox}" style="height:${Math.round(size * inset)}px;width:auto">${pathTag(mark, stroke)}</svg>
</div></body></html>`;

const browser = await chromium.launch();
const shoot = async (file, w, h, html, selector) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.locator(selector).screenshot({ path: resolve(ROOT, file), omitBackground: true });
  await page.close();
  console.log(file);
};
const markPng = (file, h, fill, stroke) => {
  const w = Math.round((h * vw) / vh);
  return shoot(file, w, h, `<!doctype html><body style="margin:0">${svg(fill, stroke).replace("<svg ", `<svg id="m" style="display:block;width:${w}px;height:${h}px" `)}</body>`, "#m");
};

for (const [name, hex] of Object.entries(COLOURS)) {
  await markPng(`public/brand/horse-${name}.png`, 1200, hex, 0);
  await markPng(`public/brand/horse-${name}-small.png`, 256, hex, SMALL_STROKE);
}
for (const [name, t] of Object.entries(TILES)) {
  await shoot(`public/brand/tile-${name}.png`, 1024, 1024, tile(1024, t.ground, t.mark, 0.72, 0, 16), "#t");
}
await shoot("src/app/icon.png", 512, 512, tile(512, "#14281f", "#f6f1e7", 0.8, 92, 72), "#t");
await shoot("src/app/apple-icon.png", 180, 180, tile(180, "#14281f", "#f6f1e7", 0.72, 0, 40), "#t");
await browser.close();
