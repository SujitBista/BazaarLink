import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth/session";
import type { SignupInput, LoginInput, PasswordResetConfirmInput } from "@/lib/validations/auth";
import type { SessionUser } from "@/types/api";
import { createHash, randomBytes } from "crypto";

/** Generic login failure copy; do not distinguish missing email vs bad password. */
export const AUTH_ERROR_INVALID_CREDENTIALS = "Invalid credentials";
const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60; // 1 hour
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

type ServiceError = Error & { statusCode?: number; code?: string };

function createServiceError(message: string, statusCode: number, code: string): ServiceError {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function toSessionUser(user: {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean | null;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
  };
}

/**
 * Registers a new **customer** account. Roles other than CUSTOMER are assigned through
 * explicit admin or controlled onboarding flows, not public signup.
 */
export async function signup(input: SignupInput): Promise<SessionUser> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: UserRole.CUSTOMER,
        emailVerified: false,
      },
    });
    return toSessionUser(user);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw createServiceError("An account with this email already exists", 409, "EMAIL_EXISTS");
    }
    throw e;
  }
}

export async function login(input: LoginInput): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw createServiceError(AUTH_ERROR_INVALID_CREDENTIALS, 401, "INVALID_CREDENTIALS");
  }
  return toSessionUser(user);
}

export async function signupWithSession(input: SignupInput): Promise<SessionUser> {
  const sessionUser = await signup(input);
  const token = await createSession(sessionUser);
  await setSessionCookie(token);
  return sessionUser;
}

export async function loginWithSession(input: LoginInput): Promise<SessionUser> {
  const sessionUser = await login(input);
  const token = await createSession(sessionUser);
  await setSessionCookie(token);
  return sessionUser;
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
}

/**
 * Resolves the current JWT against the database and refreshes the session cookie when
 * `role` or `emailVerified` no longer matches (immediate reflection of DB changes).
 */
export async function getResolvedSession(): Promise<SessionUser | null> {
  const jwt = await getSession();
  if (!jwt) return null;
  const db = await getUserAuthProfileById(jwt.id);
  if (!db) return null;
  const resolved: SessionUser = {
    id: db.id,
    email: db.email,
    role: db.role,
    emailVerified: Boolean(db.emailVerified),
  };
  if (resolved.role !== jwt.role || resolved.emailVerified !== jwt.emailVerified) {
    const token = await createSession(resolved);
    await setSessionCookie(token);
  }
  return resolved;
}

/** Current auth fields from DB (e.g. `/api/auth/me`); keeps `emailVerified` accurate after verification. */
export async function getUserAuthProfileById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, emailVerified: true },
  });
}

export async function requestEmailVerification(email: string): Promise<{ token: string | null }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });
  if (!user || user.emailVerified) {
    return { token: null };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return { token: rawToken };
}

export async function confirmEmailVerification(rawToken: string): Promise<{ userId: string }> {
  const tokenHash = hashToken(rawToken);

  const tokenRow = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!tokenRow) {
    throw createServiceError("Invalid verification token", 400, "INVALID_VERIFICATION_TOKEN");
  }
  if (tokenRow.usedAt) {
    throw createServiceError("Verification token already used", 409, "TOKEN_ALREADY_USED");
  }
  if (tokenRow.expiresAt.getTime() <= Date.now()) {
    throw createServiceError("Verification token expired", 400, "TOKEN_EXPIRED");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: tokenRow.userId },
      data: { emailVerified: true },
    });
    await tx.emailVerificationToken.update({
      where: { id: tokenRow.id },
      data: { usedAt: new Date() },
    });
  });

  return { userId: tokenRow.userId };
}

/** Creates a reset token; returns raw token for non-production or email delivery integration. */
export async function requestPasswordReset(email: string): Promise<{ token: string | null }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return { token: null };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return { token: rawToken };
}

export async function confirmPasswordReset(input: PasswordResetConfirmInput): Promise<void> {
  const tokenHash = hashToken(input.token);

  const tokenRow = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!tokenRow) {
    throw createServiceError("Invalid reset token", 400, "INVALID_RESET_TOKEN");
  }
  if (tokenRow.usedAt) {
    throw createServiceError("Reset token already used", 409, "TOKEN_ALREADY_USED");
  }
  if (tokenRow.expiresAt.getTime() <= Date.now()) {
    throw createServiceError("Reset token expired", 400, "TOKEN_EXPIRED");
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: tokenRow.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.update({
      where: { id: tokenRow.id },
      data: { usedAt: new Date() },
    });
  });
}

/** Re-issue session cookie from DB (e.g. after onboarding updates role). */
export async function refreshSessionForUserId(userId: string): Promise<void> {
  const db = await getUserAuthProfileById(userId);
  if (!db) return;
  const token = await createSession({
    id: db.id,
    email: db.email,
    role: db.role,
    emailVerified: Boolean(db.emailVerified),
  });
  await setSessionCookie(token);
}
