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
