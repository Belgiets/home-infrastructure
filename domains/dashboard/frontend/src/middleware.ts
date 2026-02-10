import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PUBLIC_ROUTES } from "@/config/routes";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Get tokens from cookies
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // If no refresh token and trying to access protected route - redirect to login
  // (Access token might be expired, but refresh token should still be valid)
  if (!refreshToken && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If has refresh token and trying to access login/register - redirect to home
  if (refreshToken && isPublicRoute) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

// Configure which routes middleware runs on
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
