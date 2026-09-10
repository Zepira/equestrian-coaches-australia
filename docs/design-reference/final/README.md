# Final side-by-side gallery

`index.html` puts every built Claude Design frame (`../frames`) beside the app's own full-page capture (`../app`) at the same width — 12 pairs: home, search, coach profile, for-coaches, coach dashboard and rider account, each at 390 and 1280. The deviations list at the top is read straight from `docs/redesign-plan.md` §5 at build time.

Rebuild after re-capturing:

```bash
node scripts/design-reference/build-final-gallery.mjs
```

Captures come from `parity-check.mjs` with the labels the script expects (`home`, `search-location--endigo-`, `profile`, `for-coaches`, `dashboard`, `account`); the dashboard and account ones need `throwaway-coach.mjs create-rider` seeded and `--login`.

Style parity itself is proved by the assertion files in `../assertions` (every phase's counts are in the plan); behaviour by the `*-behaviour.mjs`, `scripts/smoke/*` and `site-sweep.mjs` suites. This page is the visual record, not the proof.
