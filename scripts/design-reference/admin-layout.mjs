// Does an admin screen lay out against the column it actually has?
//
// The rail (AdminNav) takes 224px from 900px up, so the content column is
// narrower than the window by 279-320px, and at 900px it is narrower than it
// was at 899px. Screens used to key their grids off the window (`sm:`), so a
// three-column form fired at a 640px window and stayed on while the column
// itself was 572px. They key off the column now (`@[...]/admin:`), and this
// measures that: the column's real width at each size, and how many columns
// each grid actually renders there.
//
// No database and no login needed: it drives the built CSS and the real class
// strings from the screens through a stand-in of the admin shell, which is how
// the rail itself was measured.
//
//   npm run build && node scripts/design-reference/admin-layout.mjs
import { chromium } from "playwright";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const css = readdirSync(".next/static/chunks")
  .filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync(`.next/static/chunks/${f}`, "utf8"))
  .join("\n");

// Copied from the screens, so this measures what ships, not a sketch of it.
const GRIDS = [
  { screen: "riders", what: "counts", cls: "grid gap-3 @[880px]/admin:grid-cols-4", at: 880, narrow: 1, wide: 4 },
  { screen: "riders", what: "breakdown tables", cls: "grid gap-6 @[760px]/admin:grid-cols-3", at: 760, narrow: 1, wide: 3 },
  { screen: "waitlist", what: "counts", cls: "grid grid-cols-2 gap-3 @[880px]/admin:grid-cols-4", at: 880, narrow: 2, wide: 4 },
  { screen: "invites", what: "new invite form", cls: "grid gap-3 @[560px]/admin:grid-cols-2", at: 560, narrow: 1, wide: 2 },
  { screen: "settings", what: "a setting row", cls: "flex flex-col gap-3 @[560px]/admin:flex-row @[560px]/admin:items-end", at: 560, narrow: "column", wide: "row" },
  { screen: "audience", what: "counts with a spanning note", cls: "grid gap-3 @[760px]/admin:grid-cols-3", at: 760, narrow: 1, wide: 3, span: "@[760px]/admin:col-span-2" },
  { screen: "professions", what: "new profession form", cls: "grid gap-3 @[560px]/admin:grid-cols-[1fr_1fr_auto_auto] @[560px]/admin:items-end", at: 560, narrow: 1, wide: 4 },
];

// The shell, class for class from src/app/admin/layout.tsx.
const SHELL = `<div class="mx-auto max-w-[1360px] px-4 py-6 min-[640px]:px-6 min-[900px]:grid min-[900px]:grid-cols-[224px_minmax(0,1fr)] min-[900px]:items-start min-[900px]:gap-10 min-[900px]:px-8 min-[900px]:py-9 min-[1200px]:gap-14">
<div class="hidden min-[900px]:block" data-rail>rail</div>
<div class="@container/admin min-w-0 pt-6 min-[900px]:pt-0" data-col>
${GRIDS.map((g, i) => `<div class="${g.cls}" data-grid="${i}"><i>a</i><i>b</i><i class="${g.span ?? ""}">c</i><i>d</i></div>`).join("\n")}
</div></div>`;

const page = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style>
<style>[data-rail]{width:224px}[data-grid] i{display:block;min-width:0;background:#eee}</style>
</head><body>${SHELL}</body></html>`;
const file = "/tmp/admin-layout-standin.html";
writeFileSync(file, page);

// What the layout's own classes say the column should be.
const expectedColumn = (vw) => {
  if (vw < 900) return vw - 2 * (vw >= 640 ? 24 : 16);
  return Math.min(vw, 1360) - 64 - 224 - (vw >= 1200 ? 56 : 40);
};

const WIDTHS = [390, 640, 768, 899, 900, 1024, 1100, 1199, 1200, 1280, 1440, 1920];
let failed = 0;
const row = (ok, label, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? `  — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const ctx = await browser.newContext();
const p = await ctx.newPage();
await p.goto(pathToFileURL(file).href);

for (const vw of WIDTHS) {
  await p.setViewportSize({ width: vw, height: 900 });
  const m = await p.evaluate((n) => {
    const col = document.querySelector("[data-col]");
    const tracks = (el) => getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length;
    return {
      col: Math.round(col.getBoundingClientRect().width),
      grids: [...document.querySelectorAll("[data-grid]")].map((el) => {
        const cs = getComputedStyle(el);
        return cs.display === "grid" ? tracks(el) : cs.flexDirection;
      }),
      overflow: document.documentElement.scrollWidth > n,
      past: (() => {
        const r = col.getBoundingClientRect();
        let worst = 0;
        for (const el of col.querySelectorAll("*")) worst = Math.max(worst, el.getBoundingClientRect().right - r.right);
        return Math.round(worst);
      })(),
    };
  }, vw);

  row(m.col === expectedColumn(vw), `${vw}: column is ${m.col}px`, `expected ${expectedColumn(vw)}`);
  row(!m.overflow, `${vw}: no horizontal scroll`);
  row(m.past <= 1, `${vw}: nothing spills out of the column`, `worst ${m.past}px past the edge`);
  GRIDS.forEach((g, i) => {
    const wide = m.col >= g.at;
    const want = wide ? g.wide : g.narrow;
    row(m.grids[i] === want, `${vw}: ${g.screen} ${g.what} ${wide ? "wide" : "narrow"}`,
      `column ${m.col} vs ${g.at}, got ${m.grids[i]}, want ${want}`);
  });
}

await browser.close();
console.log(failed ? `\n${failed} failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
