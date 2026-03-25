import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
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
    const path = request.nextUrl.pathname;
    // Cron + FCM service worker must stay public (no session / no cookies)
    if (path.startsWith("/api/cron/") || path === "/firebase-messaging-sw.js") {
      return NextResponse.next({ request });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAuthPage = request.nextUrl.pathname.startsWith("/auth/login");
    const isCallback = request.nextUrl.pathname.startsWith("/auth/callback");
    const isPublicPage = request.nextUrl.pathname === "/";

    if (!user && !isAuthPage && !isCallback && !isPublicPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    if (user && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  } catch {
    // If Supabase is unreachable, allow the request through
    // rather than hanging the entire deployment
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}
