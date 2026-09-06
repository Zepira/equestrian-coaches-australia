/**
 * Build the responsive hero image set.
 *
 * Reads the art-directed master crops from `assets/hero/<crop>.jpg` and writes
 * an AVIF + WebP ladder (plus one JPEG fallback) per crop into `public/hero/`.
 *
 * Run after changing a master:  node scripts/build-hero-images.mjs
 * Requires sharp, which is NOT a project dependency — the app never needs it
 * at runtime, only this script does:
 *
 *   npm install --no-save sharp && node scripts/build-hero-images.mjs && npm uninstall sharp
 *
 * The three crops exist because the hero has two layouts (see `.hero` in
 * src/app/globals.css) and the horse must never sit under the text:
 *
 *   wide         overlay layout — text sits over the left of the photo,
 *                horse is composed hard right so the two never collide
 *   band-wide    split layout, tablet — photo is a band above the text
 *   band-narrow  split layout, phone — same idea, tighter band
 *
 * Ladder widths follow Next.js's default deviceSizes where the master allows.
 * None of them upscale: a width larger than the master is skipped, so the
 * ceiling is whatever resolution the master actually has.
 */
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "assets/hero";
const OUT = "public/hero";

/** Per-crop ladder. Keep 4–6 widths: the byte step between them should be
 *  roughly 20KB (Cloud Four's heuristic), which is content-dependent. */
const CROPS = {
  wide: { widths: [768, 1024, 1280, 1536], fallback: 1280 },
  "band-wide": { widths: [640, 1024, 1360, 1720], fallback: 1024 },
  "band-narrow": { widths: [400, 600, 828, 1140], fallback: 828 },
};

const QUALITY = { avif: 55, webp: 74, jpeg: 80 };

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const masters = (await readdir(SRC)).filter((f) => f.endsWith(".jpg"));
const rows = [];

for (const file of masters) {
  const crop = path.basename(file, ".jpg");
  const spec = CROPS[crop];
  if (!spec) {
    console.warn(`skip ${file} — no ladder configured for crop "${crop}"`);
    continue;
  }

  const master = sharp(path.join(SRC, file));
  const { width: mw, height: mh } = await master.metadata();

  for (const w of spec.widths) {
    if (w > mw) {
      console.warn(`skip ${crop}-${w} — master is only ${mw}px wide, refusing to upscale`);
      continue;
    }
    const resized = () => sharp(path.join(SRC, file)).resize({ width: w, withoutEnlargement: true });

    const avif = await resized().avif({ quality: QUALITY.avif }).toFile(`${OUT}/${crop}-${w}.avif`);
    const webp = await resized().webp({ quality: QUALITY.webp }).toFile(`${OUT}/${crop}-${w}.webp`);
    rows.push([`${crop}-${w}`, `${avif.width}x${avif.height}`, kb(avif.size), kb(webp.size)]);

    if (w === spec.fallback) {
      await resized().jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(`${OUT}/${crop}-${w}.jpg`);
    }
  }

  console.log(`${crop}: master ${mw}x${mh} (aspect ${(mw / mh).toFixed(2)}:1)`);
}

console.log("\nname                 dimensions    avif      webp");
for (const [n, d, a, w] of rows) {
  console.log(`${n.padEnd(20)} ${d.padEnd(13)} ${a.padStart(7)} ${w.padStart(9)}`);
}

function kb(bytes) {
  return `${Math.round(bytes / 1024)}KB`;
}
