import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { FIRST_TOUCH, setTouchCookies, touchFromParams } from "@/lib/touch";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  // Any address with utm_source or ref records where the visitor came from
  // (The Marketing Engine M2); /go/ links do the same in their own route.
  const touch = request.nextUrl.pathname.startsWith("/go/") ? null : touchFromParams(request.nextUrl.searchParams);
  if (touch) setTouchCookies(response, touch, request.cookies.has(FIRST_TOUCH));
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, so the session cookie
     * stays fresh on every navigation without re-running on images/fonts.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
