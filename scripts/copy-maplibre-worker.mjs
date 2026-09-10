// MapLibre parses vector tiles in a Web Worker. Under Next/Turbopack the
// bundler-generated worker URL resolves to an HTML 404 ("non-JavaScript MIME
// type"), so the map draws nothing. Serve MapLibre's own worker bundle
// from /public instead and point maplibregl.workerUrl at it (coach-map.tsx).
// Runs before `dev` and `build` (package.json); the copy is gitignored and
// pinned to the installed maplibre-gl version.
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
mkdirSync(resolve(root, "public/vendor"), { recursive: true });
// The worker is an ES module that imports the shared chunk beside it, so
// both files travel together.
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(resolve(root, "node_modules/maplibre-gl/dist", f), resolve(root, "public/vendor", f));
}
console.log("copied maplibre-gl-worker.mjs + maplibre-gl-shared.mjs → public/vendor/");
