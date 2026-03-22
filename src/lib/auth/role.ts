import type { SessionUser } from "@/types/api";
import type { UserRole } from "@/types/enums";

export function hasRole(user: SessionUser | null, role: UserRole): boolean {
  return user?.role === role;
}

export function isAdmin(user: SessionUser | null): boolean {
  return hasRole(user, "ADMIN");
}

export function isVendor(user: SessionUser | null): boolean {
  return hasRole(user, "VENDOR");
}

export function isCustomer(user: SessionUser | null): boolean {
  return hasRole(user, "CUSTOMER");
}

export function requireAuth(user: SessionUser | null): asserts user is SessionUser {
  if (!user) {
    const err = new Error("Unauthorized");
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
}

export function requireRole(user: SessionUser | null, role: UserRole): asserts user is SessionUser {
  requireAuth(user);
  if (user.role !== role) {
    const err = new Error("Forbidden");
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
}
