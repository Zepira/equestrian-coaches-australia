// Checks the host gate for real (src/lib/launch.ts, src/proxy.ts): what each
// kind of host serves, what it refuses, and what it tells crawlers.
//
// It drives a running server by sending a Host header, because that is the
// only thing the gate reads. Nothing here needs a database or a browser.
//
//   npm run build
//   PUBLIC_HOST=equineprofessionals.com.au SITE_LAUNCHED=false \
//     REDIRECT_HOSTS=equineprofessionals.au \
//     TEST_AUTH_USER=kim TEST_AUTH_PASSWORD=hoofbeats npm start
//   node scripts/launch/host-gate.mjs
//
// Modes, each matching how the server it talks to was started:
//   --mode prelaunch   (default) SITE_LAUNCHED=false, password set
//   --mode nopassword  SITE_LAUNCHED=false, TEST_AUTH_* unset
//   --mode launched    SITE_LAUNCHED=true
//   --mode dev         started with no environment at all, the way a
//                      developer or a local agent runs it
import { request } from "node:http";

const args = process.argv.slice(2);
const at = (flag, fallback) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback);
const base = at("--base", "http://localhost:3000");
const mode = at("--mode", "prelaunch");
const PUBLIC_HOST = at("--public-host", "equineprofessionals.com.au");
const TEST_HOST = at("--test-host", "test.equineprofessionals.com.au");
const user = at("--user", "kim");
const password = at("--password", "hoofbeats");

let failed = 0;
const row = (ok, label, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`);
};

/**
 * One request, with the Host header the gate reads and redirects never
 * followed so a 301 can be asserted.
 *
 * node:http rather than fetch: undici drops a Host header you set, so every
 * request arrives looking like localhost, which the gate deliberately exempts.
 * That made an earlier version of this script pass everything by testing
 * nothing.
 */
function get(path, { host = PUBLIC_HOST, auth } = {}) {
  const url = new URL(base);
  const headers = { Host: host };
  if (auth) headers.Authorization = `Basic ${Buffer.from(auth).toString("base64")}`;
  return new Promise((resolve, reject) => {
    const req = request(
      { hostname: url.hostname, port: url.port, path, method: "GET", headers },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (body += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: { get: (k) => res.headers[k.toLowerCase()] ?? null },
            body,
          })
        );
      }
    );
    req.on("error", reject);
    req.end();
  });
}

const COMING_SOON = "Hear when it opens";
const noindex = (r) => (r.headers.get("x-robots-tag") ?? "").includes("noindex");

console.log(`host gate: ${mode}, against ${base}\n`);

if (mode === "prelaunch") {
  // 1. The public host shows the coming soon page, and it is indexable.
  const home = await get("/");
  row(home.status === 200 && home.body.includes(COMING_SOON), "public host / is the coming soon page", `status ${home.status}`);
  row(!noindex(home), "public host / is not marked noindex");
  row(!home.body.includes("<footer"), "coming soon page carries no site footer");

  // 2. Nothing else on the public host is reachable, /admin least of all.
  for (const path of ["/admin", "/admin/handbook", "/coaches", "/search", "/profile/anyone", "/dashboard"]) {
    const r = await get(path);
    const hidden = r.status === 200 && r.body.includes(COMING_SOON) && noindex(r);
    row(hidden, `public host ${path} shows the coming soon page, noindex`, `status ${r.status}`);
  }

  // 3. An API nobody should be calling yet says not found rather than answering.
  const api = await get("/api/terms");
  row(api.status === 404, "public host /api/terms is 404", `status ${api.status}`);

  // 4. The unsubscribe link in the confirmation email still works.
  const unsub = await get("/unsubscribe?w=deadbeef");
  row(unsub.status === 200 && !unsub.body.includes(COMING_SOON), "public host /unsubscribe still answers", `status ${unsub.status}`);

  // 5. robots.txt offers the home page only; the sitemap lists only it.
  const robots = await get("/robots.txt");
  row(robots.body.includes("Allow: /$") && robots.body.includes("Disallow: /"), "public robots.txt allows only /", robots.body.replace(/\n/g, " ").slice(0, 80));
  const sitemap = await get("/sitemap.xml");
  row((sitemap.body.match(/<url>/g) ?? []).length === 1, "public sitemap.xml lists one page");

  // 5b. Whatever NEXT_PUBLIC_SITE_URL says, a host must name itself to
  //     crawlers. Pointing the public host's canonical or sitemap at the
  //     password-protected test host is how the one indexable page fails to be
  //     indexed, and it is easy to do by setting one variable.
  row(!robots.body.includes(TEST_HOST), "public robots.txt does not point at the test host", (robots.body.match(/Sitemap:.*/) ?? [""])[0]);
  row(home.body.includes(`href="https://${PUBLIC_HOST}"`) || home.body.includes(`href="http://${PUBLIC_HOST}"`), "the coming soon page's canonical is the public host",
    (home.body.match(/<link rel="canonical"[^>]*>/) ?? [""])[0]);

  // 6. One address for the site.
  const www = await get("/coaches", { host: `www.${PUBLIC_HOST}` });
  row(www.status === 301 && (www.headers.get("location") ?? "").includes(`${PUBLIC_HOST}/coaches`), "www 301s to the bare domain, path kept", www.headers.get("location") ?? "");
  const au = await get("/", { host: "equineprofessionals.au" });
  row(au.status === 301, "a host in REDIRECT_HOSTS 301s", `status ${au.status}`);

  // 7. The test host asks for a password, and an unknown host does too: that
  //    is what covers the project's own *.vercel.app address.
  const test = await get("/", { host: TEST_HOST });
  row(test.status === 401 && (test.headers.get("www-authenticate") ?? "").startsWith("Basic"), "test host asks for a password", `status ${test.status}`);
  row(noindex(test), "test host 401 is noindex");
  const unknown = await get("/", { host: "equine-professionals.vercel.app" });
  row(unknown.status === 401, "an unknown host asks for a password too", `status ${unknown.status}`);
  const wrong = await get("/", { host: TEST_HOST, auth: `${user}:nope` });
  row(wrong.status === 401, "the wrong password is refused", `status ${wrong.status}`);

  // 8. With the password, the test host serves the real site, never indexed.
  const authed = await get("/", { host: TEST_HOST, auth: `${user}:${password}` });
  row(authed.status === 200 && !authed.body.includes(COMING_SOON), "test host serves the real site", `status ${authed.status}`);
  row(noindex(authed), "test host sends X-Robots-Tag noindex");
  const authedAdmin = await get("/admin", { host: TEST_HOST, auth: `${user}:${password}` });
  row(authedAdmin.status < 400 || authedAdmin.status === 404, "test host /admin is reachable past the password", `status ${authedAdmin.status}`);
  const testRobots = await get("/robots.txt", { host: TEST_HOST, auth: `${user}:${password}` });
  row(testRobots.body.includes("Disallow: /") && !testRobots.body.includes("Allow:"), "test robots.txt disallows everything", testRobots.body.replace(/\n/g, " ").slice(0, 60));

  // 9. The machines still get through: Vercel Cron and Stripe. Both answer 401
  //    of their own when their secret is missing, so the tell is the absence of
  //    the password challenge, not the status.
  for (const path of ["/api/cron/seo-digest", "/api/webhooks/stripe"]) {
    const r = await get(path, { host: TEST_HOST });
    row(!r.headers.get("www-authenticate"), `test host ${path} is not behind the password`, `status ${r.status}`);
  }
}

if (mode === "nopassword") {
  const r = await get("/", { host: TEST_HOST });
  row(r.status === 503, "a gated host with no password set serves 503, not the site", `status ${r.status}`);
  row(!r.body.includes("<footer"), "and no page content with it");
  const home = await get("/");
  row(home.status === 200 && home.body.includes(COMING_SOON), "the public host is unaffected", `status ${home.status}`);
}

if (mode === "launched") {
  const home = await get("/");
  row(home.status === 200 && !home.body.includes(COMING_SOON), "public host / is the real home page", `status ${home.status}`);
  row(home.body.includes("<footer"), "the site footer is back");
  row(!noindex(home), "public host / is indexable");
  const coaches = await get("/coaches");
  row(coaches.status === 200 && !coaches.body.includes(COMING_SOON), "public host /coaches is the coaches page", `status ${coaches.status}`);
  const robots = await get("/robots.txt");
  row(robots.body.includes("Allow: /") && !robots.body.includes("Allow: /$"), "robots.txt is back to the normal rules");
  const sitemap = await get("/sitemap.xml");
  row((sitemap.body.match(/<url>/g) ?? []).length > 1, "the sitemap lists the site again", `${(sitemap.body.match(/<url>/g) ?? []).length} urls`);
  // A gated host stays gated after launch: that is what keeps the *.vercel.app
  // address and any preview out of the index for good.
  const test = await get("/", { host: TEST_HOST });
  row(test.status === 401, "the test host still asks for a password after launch", `status ${test.status}`);
  const authed = await get("/", { host: TEST_HOST, auth: `${user}:${password}` });
  row(noindex(authed), "and is still noindex");
}

if (mode === "dev") {
  // A developer with an empty .env must get the site, not the coming soon
  // page: that was a real bug, found by running the server with no
  // environment rather than by reading the code.
  const home = await get("/", { host: "localhost" });
  row(home.status === 200 && !home.body.includes(COMING_SOON), "localhost with no environment serves the real site", `status ${home.status}`);
  row(home.body.includes("<footer"), "with its header and footer");
  const other = await get("/coaches", { host: "localhost" });
  row(other.status === 200 && !other.body.includes(COMING_SOON), "and every other page too", `status ${other.status}`);
  const robots = await get("/robots.txt", { host: "localhost" });
  row(!robots.body.includes("Allow: /$"), "robots.txt is the normal one");
}

console.log(`\n${failed === 0 ? "all checks passed" : `${failed} check(s) failed`}`);
process.exit(failed === 0 ? 0 : 1);
