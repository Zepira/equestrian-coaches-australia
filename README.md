# Equestrian Coaches Australia

Marketplace/directory connecting riders with riding coaches across Australia. See [CLAUDE.md](CLAUDE.md) for full project context, tech stack, and decisions.

## Repo layout

- **`/` (this app)** — the real Next.js app, deployed to Vercel.
- **`design-preview/`** — the five homepage design directions deck (exported from Claude Design), auto-published to GitHub Pages via a `gh-pages` branch on every push to `design-preview/**`.
  **Live preview:** https://zepira.github.io/equestrian-coaches-australia/

Once a direction is chosen, its palette/type get pulled into the app's design tokens — the deck itself stays around as a reference/archive.
