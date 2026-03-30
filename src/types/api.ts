import type { UserRole } from "./enums";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}
