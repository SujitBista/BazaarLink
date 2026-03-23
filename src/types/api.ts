import type { UserRole } from "./enums";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface ApiError {
  error: string;
  code?: string;
}
