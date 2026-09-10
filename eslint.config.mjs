import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendor export from Claude Design — not app source, not ours to lint.
    "design-preview/**",
    // Claude Design canvas export (Golden Hour redesign source of truth) —
    // ships its own React runtime (support.js), not app source.
    ".claude/**",
    // MapLibre worker files copied into public/ at dev/build time.
    "public/vendor/**",
  ]),
]);

export default eslintConfig;
