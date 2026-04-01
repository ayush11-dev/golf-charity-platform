import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie.name, cookie.value);
  }
}

function redirectWithCookies(
  request: NextRequest,
  fromResponse: NextResponse,
  destination: string,
) {
  const redirectResponse = NextResponse.redirect(
    new URL(destination, request.url),
  );
  copyCookies(fromResponse, redirectResponse);
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = claims?.sub;
  const email = typeof claims?.email === "string" ? claims.email : null;
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdminByEmail = Boolean(userId && adminEmail && email === adminEmail);

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isSubscribePage = pathname.startsWith("/subscribe");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");
  const needsAuth = isSubscribePage || isDashboardRoute || isAdminRoute;

  if (!userId && needsAuth) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (userId && isAuthPage) {
    return redirectWithCookies(
      request,
      supabaseResponse,
      isAdminByEmail ? "/admin" : "/dashboard",
    );
  }

  if (userId && isAdminByEmail && (isSubscribePage || isDashboardRoute)) {
    return redirectWithCookies(request, supabaseResponse, "/admin");
  }

  if (userId && isAdminRoute) {
    if (adminEmail && email !== adminEmail) {
      return redirectWithCookies(request, supabaseResponse, "/dashboard");
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher:
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
};
