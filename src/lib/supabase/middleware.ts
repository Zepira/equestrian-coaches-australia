import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const COACH_ROUTES = "/dashboard";
const RIDER_ROUTES = "/account";
const ADMIN_ROUTES = "/admin";

// Refreshes the Supabase session on every request and gates the coach
// dashboard / rider account routes. Runs from src/middleware.ts.
export async function updateSession(request: NextRequest) {
  // Not pointed at a live Supabase project yet (phase 2 hand-off) — let
  // every route through rather than lock the dashboard/account pages.
  if (!isSupabaseConfigured) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsAuth =
    pathname.startsWith(COACH_ROUTES) ||
    pathname.startsWith(RIDER_ROUTES) ||
    pathname.startsWith(ADMIN_ROUTES);

  if (needsAuth && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname.startsWith(COACH_ROUTES)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "coach") {
      return NextResponse.redirect(new URL("/account", request.url));
    }
  }

  if (user && pathname.startsWith(ADMIN_ROUTES)) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}
