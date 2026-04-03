import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth/session-core";
import { UserRole } from "@/types/enums";

/**
 * - Customer marketplace pages (`/cart`, `/checkout`, `/orders`): require sign-in as CUSTOMER;
 *   others redirect to login or role-appropriate app area.
 * - Protected API routes: require a valid session cookie (role checks live in handlers).
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isCustomerMarketplacePage =
    pathname === "/cart" || pathname === "/checkout" || pathname === "/orders";

  if (isCustomerMarketplacePage) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);

    if (!token) {
      return NextResponse.redirect(loginUrl);
    }
    const user = await verifySessionToken(token);
    if (!user) {
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== UserRole.CUSTOMER) {
      if (user.role === UserRole.ADMIN) {
        return NextResponse.redirect(new URL("/admin/analytics", request.url));
      }
      return NextResponse.redirect(new URL("/vendor/dashboard", request.url));
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
  matcher: ["/api/admin/:path*", "/api/vendors/:path*", "/cart", "/checkout", "/orders"],
};
