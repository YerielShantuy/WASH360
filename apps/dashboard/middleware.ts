import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const MOBILE_UA = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i;
const OPEN_PATHS = new Set(["/mobile/sign-in", "/mobile/sign-up"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/mobile")) {
    return NextResponse.next();
  }

  // ── 1. Block desktop browsers (production only) ───────────────────────────
  const ua = request.headers.get("user-agent") ?? "";
  const isLocalhost = request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1";
  if (!isLocalhost && process.env.NODE_ENV === "production" && !MOBILE_UA.test(ua)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ── 2. Auth check for protected routes ────────────────────────────────────
  if (OPEN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/mobile/sign-in", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/mobile/:path*"],
};
