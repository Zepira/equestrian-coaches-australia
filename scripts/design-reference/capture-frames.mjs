// Renders every Claude Design canvas in `.claude/design-export/` with a real
// browser and writes, per frame:
//   docs/design-reference/frames/<canvas>--<label>--designed.png  (as designed,
//       frame at its own max-height / internal scroll)
//   docs/design-reference/frames/<canvas>--<label>--full.png      (unrolled,
//       every data-reveal forced visible, so the whole page is on one image)
//   docs/design-reference/spec/<canvas>--<label>.json             (computed
//       styles + bounding boxes for every text, image and control element)
//
// The JSON is the "spec" the redesign phases assert the live app against.
// Usage: node scripts/design-reference/capture-frames.mjs [canvasFilter]
//
// Needs network: the canvases load React + Babel from unpkg and fonts from
// Google Fonts at render time.

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const EXPORT_DIR = join(ROOT, ".claude/design-export");
const OUT_FRAMES = join(ROOT, "docs/design-reference/frames");
const OUT_SPEC = join(ROOT, "docs/design-reference/spec");
const filter = process.argv[2] ?? "";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function serve(dir) {
  return new Promise((ok) => {
    const srv = createServer(async (req, res) => {
      try {
        const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
        const body = await readFile(join(dir, path));
        res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    srv.listen(0, "127.0.0.1", () => ok({ srv, port: srv.address().port }));
  });
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Runs inside the page: walk one frame, record every "leaf-ish" element.
const DUMP_FRAME = (frameIndex) => {
  const frame = document.querySelectorAll("[data-frame]")[frameIndex];
  const frameBox = frame.getBoundingClientRect();
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
  const isLeafText = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  const interesting = (el) =>
    isLeafText(el) ||
    ["IMG", "INPUT", "SELECT", "TEXTAREA", "BUTTON", "A", "H1", "H2", "H3", "P", "FIGURE", "BLOCKQUOTE"].includes(el.tagName);
  const pathOf = (el) => {
    const parts = [];
    let n = el;
    while (n && n !== frame) {
      const p = n.parentElement;
      const idx = p ? [...p.children].indexOf(n) + 1 : 1;
      parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${idx})`);
      n = p;
    }
    return parts.join(" > ");
  };
  const out = [];
  frame.querySelectorAll("*").forEach((el) => {
    if (!interesting(el)) return;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .filter(Boolean)
      .join(" ")
      .slice(0, 80);
    const rec = {
      path: pathOf(el),
      tag: el.tagName.toLowerCase(),
      text: text || undefined,
      placeholder: el.getAttribute("placeholder") ?? undefined,
      src: el.getAttribute("src") ?? undefined,
      box: {
        x: Math.round(r.left - frameBox.left),
        y: Math.round(r.top - frameBox.top + frame.scrollTop),
        w: Math.round(r.width),
        h: Math.round(r.height),
      },
      style: {},
    };
    for (const p of PROPS) rec.style[p] = cs[p];
    out.push(rec);
  });
  return {
    label: frame.getAttribute("data-screen-label"),
    width: Math.round(frameBox.width),
    scrollHeight: frame.scrollHeight,
    elements: out,
  };
};

async function main() {
  await mkdir(OUT_FRAMES, { recursive: true });
  await mkdir(OUT_SPEC, { recursive: true });
  const { srv, port } = await serve(EXPORT_DIR);
  const browser = await chromium.launch();
  const canvases = (await readdir(EXPORT_DIR))
    .filter((f) => f.endsWith(".dc.html") && !f.startsWith("Current Site") && f.includes(filter));

  for (const file of canvases) {
    const canvas = slug(file.replace(".dc.html", ""));
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => console.warn(`  [pageerror] ${e.message}`));
    await page.goto(`http://127.0.0.1:${port}/${encodeURIComponent(file)}`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-frame]", { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    // Let entrance animations (rise/fade ≤ ~1.5s) finish before the "designed" shot.
    await page.waitForTimeout(2500);

    const count = await page.locator("[data-frame]").count();
    console.log(`${file}: ${count} frames`);

    for (let i = 0; i < count; i++) {
      const frame = page.locator("[data-frame]").nth(i);
      const label = slug(await frame.getAttribute("data-screen-label"));
      await frame.scrollIntoViewIfNeeded();
      await frame.screenshot({ path: join(OUT_FRAMES, `${canvas}--${label}--designed.png`) });
    }

    // Unroll: kill max-height/height clamps, force reveals visible, then
    // re-dump + re-shoot so the full page geometry is captured.
    await page.evaluate(() => {
      document.querySelectorAll("[data-frame]").forEach((f) => {
        f.style.maxHeight = "none";
        f.style.height = "auto";
        f.style.overflow = "visible";
      });
      // Sticky bars repaint wherever the frame happens to be scrolled when
      // the full-height screenshot is stitched — pin them to their natural
      // spot instead. Overlay headers (negative margin-bottom) become
      // absolute at the top; everything else sticky becomes static flow.
      document.querySelectorAll("[data-frame] *").forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.position !== "sticky") return;
        if (parseFloat(cs.marginBottom) < 0) {
          el.style.position = "absolute";
          el.style.top = "0";
          el.style.left = "0";
          el.style.right = "0";
          el.style.marginBottom = "0";
        } else {
          el.style.position = "relative";
          el.style.top = "auto";
          el.style.bottom = "auto";
        }
      });
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
        el.style.transition = "none";
      });
    });
    await page.waitForTimeout(500);

    for (let i = 0; i < count; i++) {
      const frame = page.locator("[data-frame]").nth(i);
      const label = slug(await frame.getAttribute("data-screen-label"));
      await frame.scrollIntoViewIfNeeded();
      await frame.screenshot({ path: join(OUT_FRAMES, `${canvas}--${label}--full.png`) });
      const spec = await page.evaluate(DUMP_FRAME, i);
      spec.canvas = file;
      await writeFile(join(OUT_SPEC, `${canvas}--${label}.json`), JSON.stringify(spec, null, 1));
      console.log(`  ${label}: ${spec.elements.length} elements, ${spec.scrollHeight}px tall`);
    }
    await page.close();
  }

  await browser.close();
  srv.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
