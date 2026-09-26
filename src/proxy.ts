import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { PUBLIC_HOST, isGatedHost, normaliseHost, showsComingSoon } from "@/lib/launch";
import { FIRST_TOUCH, setTouchCookies, touchFromParams } from "@/lib/touch";

/**
 * Three jobs, in this order, before the Supabase session refresh that used to
 * be all this file did:
 *
 *   1. send www (and anything in REDIRECT_HOSTS) to the public host, 301
 *   2. ask for a password on every host that is not the public one, and mark
 *      everything it serves noindex
 *   3. on the public host before launch, show the coming soon page and
 *      nothing else
 *
 * See src/lib/launch.ts for which host is which and why it fails closed.
 */

/** Paths a gated host serves without a password, because a machine calls them. */
function isMachinePath(path: string): boolean {
  // Vercel Cron invokes the deployment's own *.vercel.app address, which is a
  // gated host, and Stripe posts to whichever URL its webhook is set to.
  // Both carry their own secret: CRON_SECRET and the Stripe signature.
  return path.startsWith("/api/cron/") || path === "/api/webhooks/stripe";
}

/**
 * Paths the public host still serves before launch. Everything else becomes
 * the coming soon page, so this list is the whole pre-launch site.
 */
function isPreLaunchPath(path: string): boolean {
  if (path === "/") return true;
  // The unsubscribe link in the waitlist confirmation email. The form itself
  // is a server action, so it posts to "/" and needs nothing of its own here.
  if (path === "/unsubscribe" || path === "/api/unsubscribe") return true;
  // The "choose what we send you, or stop it all" link in the footer of every
  // commercial email (commercialFooter in src/lib/audience.ts), and the two
  // pages its buttons lead to.
  if (path === "/email-preferences" || path.startsWith("/email-preferences/")) return true;
  // Crawlers need these two to see that only the home page is on offer.
  if (path === "/robots.txt" || path === "/sitemap.xml") return true;
  // The page's own assets: the build output, the brand mark, the favicon.
  if (path.startsWith("/_next/") || path.startsWith("/brand/") || path.startsWith("/hero/") || path.startsWith("/vendor/")) return true;
  if (path === "/icon.png" || path === "/apple-icon.png" || path === "/favicon.ico") return true;
  return false;
}

/** Stops search engines indexing anything a gated host serves. */
function markNoindex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function unauthorised(): NextResponse {
  return new NextResponse("Not open yet. A password is needed to see this.", {
    status: 401,
    headers: {
      // The realm is what the browser's password box is titled.
      "WWW-Authenticate": 'Basic realm="Equine Professionals Australia", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

/** Whether the request carries the right Basic credentials. */
function hasValidCredentials(request: NextRequest, user: string, password: string): boolean {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice("Basic ".length));
  } catch {
    return false;
  }
  // Only the first colon separates them, so a password may contain colons.
  const split = decoded.indexOf(":");
  if (split === -1) return false;
  return decoded.slice(0, split) === user && decoded.slice(split + 1) === password;
}

/**
 * The Supabase session refresh, plus where the visitor came from: any address
 * with utm_source or ref records it (The Marketing Engine M2); /go/ links do
 * the same in their own route.
 */
async function serveSite(request: NextRequest): Promise<NextResponse> {
  const response = await updateSession(request);
  const touch = request.nextUrl.pathname.startsWith("/go/") ? null : touchFromParams(request.nextUrl.searchParams);
  if (touch) setTouchCookies(response, touch, request.cookies.has(FIRST_TOUCH));
  return response;
}

export async function proxy(request: NextRequest) {
  const host = normaliseHost(request.headers.get("host") ?? "");
  const path = request.nextUrl.pathname;

  // 1. One address for the site. www and any other name in REDIRECT_HOSTS
  //    move to the public host with the path and query kept, so an old link
  //    lands where it meant to rather than on the home page.
  const redirectHosts = new Set(
    [PUBLIC_HOST ? `www.${PUBLIC_HOST}` : "", ...(process.env.REDIRECT_HOSTS ?? "").split(",")]
      .map(normaliseHost)
      .filter(Boolean)
  );
  if (PUBLIC_HOST && host !== PUBLIC_HOST && redirectHosts.has(host)) {
    const target = new URL(request.nextUrl.toString());
    target.host = PUBLIC_HOST;
    target.port = "";
    return NextResponse.redirect(target, 301);
  }

  // 2. Every host but the public one is password protected and never indexed.
  if (isGatedHost(host)) {
    if (!isMachinePath(path)) {
      const user = process.env.TEST_AUTH_USER;
      const password = process.env.TEST_AUTH_PASSWORD;
      // Fails closed: a gated host with no password configured serves nothing
      // rather than serving the unlaunched site to anyone who finds it.
      if (!user || !password) {
        return markNoindex(
          new NextResponse("This site is not configured for public access.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }
      if (!hasValidCredentials(request, user, password)) return unauthorised();
    }
    return markNoindex(await serveSite(request));
  }

  // 3. The public host before launch: the coming soon page, and nothing else.
  if (showsComingSoon(host) && !isPreLaunchPath(path)) {
    // An API nobody should be calling yet says so honestly instead of
    // answering with a page.
    if (path.startsWith("/api/")) {
      return markNoindex(new NextResponse(null, { status: 404 }));
    }
    // Anything else shows the coming soon page rather than a 404: a visitor
    // following an old or guessed link gets something useful. It is noindex
    // and rewritten rather than redirected, so only "/" itself can be indexed
    // and no other address turns into a duplicate of it.
    const comingSoon = request.nextUrl.clone();
    comingSoon.pathname = "/";
    comingSoon.search = "";
    return markNoindex(NextResponse.rewrite(comingSoon));
  }

  return serveSite(request);
}

export const config = {
  matcher: [
    /*
     * Everything except the build's own immutable assets, which carry no
     * content worth a password and cannot be indexed as pages. Narrower than
     * it was: the password and the noindex header have to cover images and
     * fonts too, or "the test site is not public" would not be true of them.
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
