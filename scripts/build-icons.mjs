// Renders the ECA wordmark favicon / apple-touch icon with the real
// Instrument Serif (loaded from Google Fonts at build time) rather than a
// system serif — a favicon can't rely on the app's webfont at runtime, so
// the letterforms are baked into PNGs here. Re-run only if the mark changes.
//
//   node scripts/build-icons.mjs   → src/app/icon.png (512) + src/app/apple-icon.png (180)

import { chromium } from "playwright";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

const html = (size, font) => `<!doctype html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;background:transparent}
  .tile{width:${size}px;height:${size}px;background:#14281f;border-radius:${Math.round(size * 0.18)}px;
    display:flex;align-items:center;justify-content:center;color:#f6f1e7;
    font:400 ${font}px/1 'Instrument Serif',serif;letter-spacing:-0.02em}
</style></head><body><div class="tile">ECA</div></body></html>`;

const browser = await chromium.launch();
for (const [file, size, font] of [
  ["src/app/icon.png", 512, 250],
  ["src/app/apple-icon.png", 180, 88],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(html(size, font), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.locator(".tile").screenshot({ path: resolve(ROOT, file), omitBackground: true });
  console.log(`${file} ${size}px`);
  await page.close();
}
await browser.close();
