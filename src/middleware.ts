import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth/session-core";
import { UserRole } from "@/types/enums";

/**
 * Ensures a valid session cookie exists before hitting protected API routes.
 * Role checks remain in route handlers (`requireAdmin`, `requireVendor`, etc.).
 * Marketplace cart/checkout pages: signed-in non-customers go to the vendor dashboard.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/cart" || pathname === "/checkout") {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      const user = await verifySessionToken(token);
      if (user && user.role !== UserRole.CUSTOMER) {
        return NextResponse.redirect(new URL("/vendor/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await verifySessionToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*", "/api/vendors/:path*", "/cart", "/checkout"],
};
