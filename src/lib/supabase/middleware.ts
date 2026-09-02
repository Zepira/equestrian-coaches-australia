import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { joinedRelation } from "@/lib/supabase/joined-relation";

const COACH_ROUTES = "/dashboard";
const RIDER_ROUTES = "/account";
const ADMIN_ROUTES = "/admin";

// Slug trap redirect — /disciplines/[slug] and /disciplines/[slug]/[area]
// are the only URLs a term slug appears in (disciplines are the only kind
// that generates_pages today). term_id is the join key rather than
// old_slug -> new_slug directly, so this resolves correctly no matter how
// many times a term's been renamed since (see changeTermSlug,
// src/app/admin/terms/actions.ts). An SEO concern, not an auth one — kept
// as its own function so updateSession's auth/role gating below reads as
// just that.
async function redirectRenamedDisciplineSlug(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const disciplineMatch = pathname.match(/^\/disciplines\/([^/]+)(\/.*)?$/);
  if (!disciplineMatch) return null;

  const [, oldSlug, rest = ""] = disciplineMatch;
  const { data: history } = await supabase
    .from("term_slug_history")
    .select("terms(slug)")
    .eq("kind", "discipline")
    .eq("old_slug", oldSlug)
    .maybeSingle();
  const currentSlug = joinedRelation<{ slug: string }>(history, "terms")?.slug;
  if (!currentSlug || currentSlug === oldSlug) return null;

  return NextResponse.redirect(new URL(`/disciplines/${currentSlug}${rest}`, request.url), 301);
}

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

  const slugRedirect = await redirectRenamedDisciplineSlug(request, supabase);
  if (slugRedirect) return slugRedirect;

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
