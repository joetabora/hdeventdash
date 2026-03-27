import { isAuthSessionMissingError } from "@supabase/auth-js";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Paths that skip session checks (no Supabase env required for these). */
function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname === "/api/fcm-service-worker") return true;
  if (pathname === "/firebase-messaging-sw.js") return true;
  return false;
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isAuthPage(pathname: string): boolean {
  return (
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/callback")
  );
}

type AuthDenyReason = "configuration" | "unavailable";

/**
 * Fail closed: block protected routes with a stable error shape for APIs
 * and a redirect for document requests.
 */
function authDenied(request: NextRequest, reason: AuthDenyReason): NextResponse {
  const path = request.nextUrl.pathname;
  if (isApiPath(path) && !isPublicPath(path)) {
    const payload =
      reason === "configuration"
        ? {
            error: "Authentication is not configured.",
            code: "AUTH_CONFIGURATION" as const,
          }
        : {
            error: "Authentication is temporarily unavailable.",
            code: "AUTH_UNAVAILABLE" as const,
          };
    return NextResponse.json(payload, { status: 503 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isPublicPath(path)) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (path === "/" || isAuthPage(path)) {
      return NextResponse.next({ request });
    }
    return authDenied(request, "configuration");
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError && !isAuthSessionMissingError(authError)) {
      const msg = String(authError.message ?? "").toLowerCase();
      if (
        msg.includes("fetch") ||
        msg.includes("network") ||
        msg.includes("failed to fetch") ||
        msg.includes("econnrefused") ||
        msg.includes("etimedout")
      ) {
        return authDenied(request, "unavailable");
      }
    }

    const isCallback = path.startsWith("/auth/callback");
    const isPublicPage = path === "/";
    const isLogin = path.startsWith("/auth/login");

    if (
      !user &&
      !isLogin &&
      !isCallback &&
      !isPublicPage
    ) {
      if (isApiPath(path)) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    if (user && isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  } catch {
    return authDenied(request, "unavailable");
  }

  return supabaseResponse;
}
