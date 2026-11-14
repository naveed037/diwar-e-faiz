import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection: if there's no session cookie at all, redirect to login before rendering.
 * This is NOT the security boundary — protected pages and every server action verify the
 * session cookie with the Firebase Admin SDK. (Next.js docs: Proxy is for optimistic checks only.)
 */
const SESSION_COOKIE = "__session";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/profile/:path*", "/donate/:path*", "/my-donations/:path*", "/messages/:path*", "/admin/:path*"],
};
