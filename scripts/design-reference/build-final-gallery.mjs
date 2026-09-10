// Builds docs/design-reference/final/index.html — every built canvas frame
// beside the app's own full-page capture at the same width, plus the
// deviations list from docs/redesign-plan.md §5. Captures come from
// parity-check.mjs (docs/design-reference/app/<label>--<width>--full.png);
// run the captures first, then this. Pure file shuffling, no browser.
//
//   node scripts/design-reference/build-final-gallery.mjs
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const FRAMES = resolve(ROOT, "docs/design-reference/frames");
const APP = resolve(ROOT, "docs/design-reference/app");
const OUT = resolve(ROOT, "docs/design-reference/final");
mkdirSync(OUT, { recursive: true });

// frame file stem → [app capture label, width, route]
const PAIRS = [
  ["eca-redesign--1a-golden-hour-mobile", "home", 390, "/"],
  ["eca-redesign--1a-golden-hour-desktop", "home", 1280, "/"],
  ["search-results--search-mobile", "search-location--endigo-", 390, "/search?location=Bendigo VIC"],
  ["search-results--search-desktop", "search-location--endigo-", 1280, "/search?location=Bendigo VIC"],
  ["coach-profile--profile-mobile", "profile", 390, "/coaches/[slug]"],
  ["coach-profile--profile-desktop", "profile", 1280, "/coaches/[slug]"],
  ["for-coaches--for-coaches-mobile", "for-coaches", 390, "/for-coaches"],
  ["for-coaches--for-coaches-desktop", "for-coaches", 1280, "/for-coaches"],
  ["dashboards--coach-dashboard-mobile", "dashboard", 390, "/dashboard"],
  ["dashboards--coach-dashboard-desktop", "dashboard", 1280, "/dashboard"],
  ["dashboards--rider-account-mobile", "account", 390, "/account"],
  ["dashboards--rider-account-desktop", "account", 1280, "/account"],
];
// Alternate directions in the export that were not chosen — listed, not built.
const NOT_BUILT = ["eca-redesign--1b-journal-mobile", "eca-redesign--1b-journal-desktop", "eca-redesign--1c-night-arena-mobile", "eca-redesign--1c-night-arena-desktop"];

const plan = readFileSync(resolve(ROOT, "docs/redesign-plan.md"), "utf8");
const devStart = plan.indexOf("## 5. Deliberate deviations");
const devEnd = plan.indexOf("\n## ", devStart + 5);
const deviations = plan.slice(devStart, devEnd === -1 ? undefined : devEnd).split("\n").filter((l) => /^\s*(\d+\.|-)\s/.test(l)).map((l) => l.replace(/^\s*(\d+\.|-)\s/, "").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let cards = "";
let missing = 0;
for (const [frame, label, width, route] of PAIRS) {
  const frameSrc = resolve(FRAMES, `${frame}--full.png`);
  const appSrc = resolve(APP, `${label}--${width}--full.png`);
  const ok = existsSync(frameSrc) && existsSync(appSrc);
  if (!ok) missing++;
  if (existsSync(frameSrc)) copyFileSync(frameSrc, resolve(OUT, `${frame}--frame.png`));
  if (existsSync(appSrc)) copyFileSync(appSrc, resolve(OUT, `${frame}--app.png`));
  cards += `<section class="pair"><h2>${esc(frame)} <span>${esc(route)} · ${width}px</span></h2><div class="cols"><figure><figcaption>Canvas frame</figcaption>${existsSync(frameSrc) ? `<img src="${frame}--frame.png" alt="">` : "<p>missing</p>"}</figure><figure><figcaption>App (${label}--${width})</figcaption>${existsSync(appSrc) ? `<img src="${frame}--app.png" alt="">` : "<p>missing capture</p>"}</figure></div></section>\n`;
}

const html = `<!doctype html><meta charset="utf-8"><title>Golden Hour — final side-by-side</title>
<style>
body{margin:0;padding:32px;background:#f6f1e7;color:#22201c;font:15px/1.5 system-ui,sans-serif}
h1{font:400 40px/1 Georgia,serif;color:#1f3a2e;margin:0 0 6px}
.pair{margin-top:40px;border-top:1px solid #e7dac6;padding-top:20px}
.pair h2{font:400 22px/1.1 Georgia,serif;color:#1f3a2e;margin:0 0 12px}.pair h2 span{font:12px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#6c685e;margin-left:12px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
figure{margin:0;background:#fffdf8;border:1px solid #e7dac6;border-radius:12px;padding:10px}
figcaption{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6c685e;margin-bottom:8px}
img{width:100%;height:auto;display:block;border-radius:6px}
ol{padding-left:22px}li{margin:8px 0}code{background:#efe9dc;padding:1px 5px;border-radius:4px}
</style>
<h1>Golden Hour — app vs canvas</h1>
<p>Left: the Claude Design frame (<code>docs/design-reference/frames</code>). Right: the running app captured by <code>parity-check.mjs</code> at the same width. Style parity is proved by the assertion files in <code>docs/design-reference/assertions</code>; this page is the visual record.</p>
<h2 style="margin-top:28px">Remaining deviations (from the plan, §5)</h2>
<ol>${deviations.map((d) => `<li>${d}</li>`).join("")}</ol>
<p>Not built, by decision: ${NOT_BUILT.map((n) => `<code>${n}</code>`).join(", ")} — alternate directions in the same export; 1a Golden Hour was chosen.</p>
${cards}`;
writeFileSync(resolve(OUT, "index.html"), html);
console.log(`wrote ${resolve(OUT, "index.html")} — ${PAIRS.length} pairs, ${missing} missing captures`);
process.exit(missing ? 1 : 0);
