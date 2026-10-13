// Mobile audit (13 Oct 2026): every page of the site at phone and tablet
// widths, measured rather than eyeballed.
//
// For each route and width it reports:
//   overflow   the page scrolls sideways, and which elements stick out
//   tap        controls smaller than 24 x 24 px that are also crowded: WCAG
//              2.2's target size rule, with its two exceptions (an inline
//              link in running text; or a 24px circle on the control's centre
//              touching no other control or another small one's circle)
//   text       visible text under 11px (Apple's minimum), decorative
//              aria-hidden text such as the logo's "AUSTRALIA" excepted
//   zoom       inputs under 16px, which iOS Safari zooms into on focus
// and writes a 390px screenshot of each page to docs/design-reference/mobile/.
//
//   npm run build && npx next start -p 3150
//   node scripts/design-reference/mobile-audit.mjs --base http://localhost:3150 [--only /dashboard] [--no-shots]
//
// Logs in as the test coach and rider from .env (scripts/smoke/test-accounts.mjs).
// For the admin pages it adds the test coach to admin_users for the run and
// removes it afterwards. Runs against localhost only. Exit 1 on any finding.
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = opt("--base", "http://localhost:3150");
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(base)) throw new Error("Runs against localhost only.");
const only = opt("--only", null);
const shots = !args.includes("--no-shots");
const WIDTHS = [320, 375, 414, 768];
const SHOT_DIR = resolve(ROOT, "docs/design-reference/mobile");
if (shots) mkdirSync(SHOT_DIR, { recursive: true });

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const db = new pg.Client({ connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(env.DATABASE_PASSWORD)}@${env.SUPABASE_POOLER_HOST || "aws-0-ap-southeast-2.pooler.supabase.com"}:5432/postgres`, ssl: { rejectUnauthorized: false } });
await db.connect();
const one = async (sql, p = []) => (await db.query(sql, p)).rows[0] ?? {};

// Real ids for the dynamic routes.
const coachUser = await one(`select id from auth.users where lower(email) = lower($1)`, [env.TEST_PROVIDER_EMAIL]);
const pick = async (sql) => { try { return (await one(sql)).v ?? null; } catch { return null; } };
const ids = {
  discipline: await pick(`select id::text v from terms where kind = 'discipline' order by name limit 1`),
  profession: await pick(`select id::text v from terms where kind = 'profession' order by name limit 1`),
  competition: await pick(`select id::text v from competitions limit 1`),
  compSlug: await pick(`select slug v from competitions where slug is not null limit 1`),
  guide: await pick(`select id::text v from guides limit 1`),
  guideSlug: await pick(`select slug v from guides where slug is not null limit 1`),
  sponsor: await pick(`select id::text v from sponsors limit 1`),
  campaign: await pick(`select id::text v from campaigns limit 1`),
  event: await pick(`select id::text v from events order by starts_on desc limit 1`),
  liveProfile: await pick(`select slug v from providers where status = 'live' limit 1`),
};

const PUBLIC = [
  "/", "/coaches", "/coaches/dressage", "/coaches/in/bendigo-vic", "/coaches/dressage/in/bendigo-vic",
  "/farriers", "/horse-care", "/horse-care/search", "/search", "/search?d=dressage&location=Bendigo+VIC",
  "/about", "/how-we-list", "/for-coaches", "/for-professionals", "/list-your-business",
  "/login", "/signup", "/signup?profession=coaches", "/forgot-password", "/reset-password",
  "/terms", "/privacy", "/cookies", "/refunds", "/review-policy", "/riders-choice", "/guides", "/competitions",
  "/unsubscribe", "/email-preferences", "/not-a-real-page",
  `/profile/${ids.liveProfile ?? "alana-l"}`, "/profile/ava-quinn-farrier-1",
  `/review/${ids.liveProfile ?? "alana-l"}`, `/testimonial/${ids.liveProfile ?? "alana-l"}`,
  ...(ids.event ? [`/events/${ids.event}`] : []),
  ...(ids.guideSlug ? [`/guides/${ids.guideSlug}`] : []),
  ...(ids.compSlug ? [`/competitions/${ids.compSlug}`] : []),
];
const COACH = ["/dashboard", "/dashboard/profile", "/dashboard/enquiries", "/dashboard/clinics", "/dashboard/billing", "/dashboard/billing/cancel",
  "/dashboard/promote", "/dashboard/reviews", "/dashboard/testimonials", "/onboarding"];
const RIDER = ["/account", "/account/delete", "/alerts/confirm"];
const ADMIN = ["/admin", "/admin/review", "/admin/providers", "/admin/riders", "/admin/professions", "/admin/disciplines", "/admin/terms", "/admin/aliases",
  "/admin/areas", "/admin/pages", "/admin/pages/footer", "/admin/emails", "/admin/emails/monthly", "/admin/plans", "/admin/settings", "/admin/audience",
  "/admin/waitlist", "/admin/sequences", "/admin/campaigns", "/admin/guides", "/admin/competitions", "/admin/sponsors", "/admin/awards", "/admin/codes",
  "/admin/invites", "/admin/links", "/admin/on-site", "/admin/reviews", "/admin/handbook", "/admin/handbook/whats-built",
  ...(ids.discipline ? [`/admin/disciplines/${ids.discipline}`] : []), ...(ids.profession ? [`/admin/professions/${ids.profession}`] : []),
  ...(ids.campaign ? [`/admin/campaigns/${ids.campaign}`] : []), ...(ids.guide ? [`/admin/guides/${ids.guide}`] : []),
  ...(ids.competition ? [`/admin/competitions/${ids.competition}`] : []), ...(ids.sponsor ? [`/admin/sponsors/${ids.sponsor}`] : [])];

/** Runs in the page: everything that misbehaves on a phone. */
function measure() {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
  };
  const name = (el) => {
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
    const txt = (el.innerText || el.getAttribute("aria-label") || el.value || "").trim().replace(/\s+/g, " ").slice(0, 30);
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${txt ? ` "${txt}"` : ""}`;
  };
  // An element inside a sideways scroller or a clipping box is meant to run past the edge.
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(s.overflowX) || s.position === "fixed") {
        const r = p.getBoundingClientRect();
        if (r.right <= vw + 1 && r.left >= -1) return true;
      }
    }
    return false;
  };
  const overflow = document.documentElement.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1;
  const sticking = [];
  if (overflow) {
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if ((r.right > vw + 1 || r.left < -1) && r.width > 0 && visible(el) && !clipped(el)) sticking.push(`${name(el)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
    }
  }
  // Innermost offenders are the useful ones.
  const targets = [];
  const small = [];
  for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], summary, label:has(> input[type=checkbox]), label:has(> input[type=radio])")) {
    if (!visible(el) || el.closest("[aria-hidden=true], .sr-only, .nojs-only")) continue;
    if ((el.type === "checkbox" || el.type === "radio") && el.closest("label")) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.right < 0 || r.left > vw) continue;
    targets.push({ el, r });
    if (r.width >= 24 && r.height >= 24) continue;
    // Inline links in running text are exempt (WCAG 2.5.8 inline exception).
    if (el.tagName === "A" && getComputedStyle(el).display === "inline" && el.closest("p, li, dd, td, label, small, span")) continue;
    small.push({ el, r, c: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
  }
  // Spacing exception: fine if the 24px circle on its centre touches no other
  // control and no other small control's circle.
  const distToRect = (c, r) => Math.hypot(Math.max(r.left - c.x, 0, c.x - r.right), Math.max(r.top - c.y, 0, c.y - r.bottom));
  const tap = [];
  for (const s of small) {
    const crowded =
      targets.some((t) => t.el !== s.el && !t.el.contains(s.el) && !s.el.contains(t.el) && distToRect(s.c, t.r) < 12) ||
      small.some((o) => o !== s && !o.el.contains(s.el) && !s.el.contains(o.el) && Math.hypot(o.c.x - s.c.x, o.c.y - s.c.y) < 24);
    if (crowded) tap.push(`${name(s.el)} ${Math.round(s.r.width)}x${Math.round(s.r.height)}`);
  }
  const tiny = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim();
    if (!t || !n.parentElement || !visible(n.parentElement) || n.parentElement.closest(".sr-only, script, style, noscript, svg, [aria-hidden=true]")) continue;
    const fs = parseFloat(getComputedStyle(n.parentElement).fontSize);
    if (fs < 11) tiny.add(`${fs}px "${t.slice(0, 30)}"`);
  }
  const zoom = [];
  for (const el of document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=submit]), select, textarea")) {
    if (!visible(el) || el.closest(".nojs-only")) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) zoom.push(`${name(el)} ${fs}px`);
  }
  return { overflow, sticking: sticking.slice(0, 6), tap: [...new Set(tap)], small: [...tiny], zoom: [...new Set(zoom)], status: 0 };
}

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {});
async function context(creds) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  if (!creds) return ctx;
  const p = await ctx.newPage();
  await p.goto(`${base}/login`, { waitUntil: "load" });
  await p.locator("input[type=email]").first().fill(creds[0]);
  await p.locator("input[type=password]").first().fill(creds[1]);
  await p.locator("form button[type=submit]").first().click();
  await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  await p.close();
  return ctx;
}

const findings = [];
let pages = 0;
async function audit(label, ctx, routes) {
  const page = await ctx.newPage();
  for (const route of routes) {
    if (only && !route.startsWith(only)) continue;
    pages++;
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: w >= 768 ? 1024 : 800 });
      const res = await page.goto(base + route, { waitUntil: "load" }).catch(() => null);
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(250);
      const m = await page.evaluate(measure);
      const status = res?.status() ?? 0;
      const where = `${label} ${route} @${w}`;
      if (status >= 500 || status === 0 || (status === 404 && route !== "/not-a-real-page")) findings.push(`${where}: HTTP ${status}`);
      if (m.overflow) findings.push(`${where}: OVERFLOW ${m.sticking.join(" | ") || "(no single element found)"}`);
      if (m.tap.length) findings.push(`${where}: TAP ${m.tap.length}: ${m.tap.slice(0, 5).join(" | ")}`);
      if (m.small.length) findings.push(`${where}: TEXT ${m.small.length}: ${m.small.slice(0, 4).join(" | ")}`);
      if (m.zoom.length) findings.push(`${where}: ZOOM ${m.zoom.slice(0, 4).join(" | ")}`);
      if (shots && w === 375) {
        const file = `${label}${route}`.replace(/[^a-z0-9]+/gi, "_").replace(/_+$/, "");
        await page.screenshot({ path: resolve(SHOT_DIR, `${file}.png`), fullPage: true }).catch(() => {});
      }
    }
    process.stdout.write(".");
  }
  await page.close();
}

let granted = false;
try {
  await audit("public", await context(null), PUBLIC);
  await audit("coach", await context([env.TEST_PROVIDER_EMAIL, env.TEST_PROVIDER_PASSWORD]), COACH);
  await audit("rider", await context([env.TEST_RIDER_EMAIL, env.TEST_RIDER_PASSWORD]), RIDER);
  if (!only || only.startsWith("/admin")) {
    const was = await one(`select 1 as v from admin_users where user_id = $1`, [coachUser.id]);
    if (!was.v) { await db.query(`insert into admin_users (user_id) values ($1)`, [coachUser.id]); granted = true; }
    await audit("admin", await context([env.TEST_PROVIDER_EMAIL, env.TEST_PROVIDER_PASSWORD]), ADMIN);
  }
} finally {
  if (granted) await db.query(`delete from admin_users where user_id = $1`, [coachUser.id]);
  await browser.close();
  await db.end();
}

console.log(`\n\n${pages} pages x ${WIDTHS.length} widths`);
for (const f of findings) console.log(f);
console.log(findings.length ? `\n${findings.length} finding(s)` : "\nno findings");
if (findings.length) process.exitCode = 1;
