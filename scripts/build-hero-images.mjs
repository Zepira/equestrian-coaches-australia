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
 *   wide         homepage — text sits over the left of the photo, horse
 *                composed hard right so the two never collide
 *   for-coaches  /for-coaches hero (Unsplash portrait master, cropped to
 *                3:2 here — `aspect` + `position` below)
 *   founding     the founding-coaches band/card behind a dark wash
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
  // `aspect` (w/h) crops a master that isn't already the hero's shape;
  // `position` is sharp's crop gravity ("top", "centre", "attention"…).
  "for-coaches": { widths: [768, 1024, 1280, 1536, 1920], fallback: 1280, aspect: 1, position: "centre" },
  founding: { widths: [640, 1024, 1400], fallback: 1024, aspect: 1.25, position: "centre" },
};

const QUALITY = { avif: 55, webp: 74, jpeg: 80 };

// Only ever regenerate crops that have a ladder configured — never wipe the
// folder, which would also delete anything else living in public/hero.
await mkdir(OUT, { recursive: true });
for (const f of await readdir(OUT)) {
  if (Object.keys(CROPS).some((c) => f.startsWith(`${c}-`))) await rm(path.join(OUT, f));
}

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
    const resized = () =>
      spec.aspect
        ? sharp(path.join(SRC, file)).resize({ width: w, height: Math.round(w / spec.aspect), fit: "cover", position: spec.position ?? "centre", withoutEnlargement: true })
        : sharp(path.join(SRC, file)).resize({ width: w, withoutEnlargement: true });

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
