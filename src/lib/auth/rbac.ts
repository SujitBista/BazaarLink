import { prisma } from "@/lib/db";
import { getResolvedSession } from "@/services/auth";
import type { SessionUser } from "@/types/api";
import { UserRole } from "@/types/enums";
import type { Vendor } from "@prisma/client";
import { VendorStatus } from "@prisma/client";

export const CUSTOMER_ONLY_MESSAGE = "Only customers can access this resource";

function unauthorized(): never {
  const err = new Error("Unauthorized");
  (err as Error & { statusCode?: number }).statusCode = 401;
  throw err;
}

function forbidden(message = "Forbidden"): never {
  const err = new Error(message);
  (err as Error & { statusCode?: number }).statusCode = 403;
  throw err;
}

/** Loads the current session from DB (refreshes JWT when role/emailVerified drift). */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getResolvedSession();
  if (!user) unauthorized();
  return user;
}

/** Requires `User.role === ADMIN` (from DB via resolved session). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") forbidden();
  return user;
}

/** Requires `User.role === VENDOR`. */
export async function requireVendor(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "VENDOR") forbidden();
  return user;
}

/**
 * Requires an authenticated user with role VENDOR and a vendor row in `APPROVED` status.
 * Use for mutations that enable selling or public catalog visibility per business rules.
 */
export async function requireApprovedVendor(): Promise<{ user: SessionUser; vendor: Vendor }> {
  const user = await requireVendor();
  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (!vendor) forbidden();
  if (vendor.status !== VendorStatus.APPROVED) forbidden();
  return { user, vendor };
}

/** Cart, checkout, orders, and payment completion — `User.role` must be CUSTOMER. */
export async function requireCustomer(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== UserRole.CUSTOMER) forbidden(CUSTOMER_ONLY_MESSAGE);
  return user;
}

/** @deprecated Use `requireCustomer`. */
export const requireCustomerForCartCheckout = requireCustomer;
/** @deprecated Use `CUSTOMER_ONLY_MESSAGE`. */
export const CART_CHECKOUT_CUSTOMER_ONLY_MESSAGE = CUSTOMER_ONLY_MESSAGE;
