import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import type { SignupInput, LoginInput } from "@/lib/validations/auth";
import type { SessionUser } from "@/types/api";

/** Generic login failure copy; do not distinguish missing email vs bad password. */
export const AUTH_ERROR_INVALID_CREDENTIALS = "Invalid credentials";

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
      const err = new Error("An account with this email already exists");
      (err as Error & { statusCode?: number }).statusCode = 409;
      throw err;
    }
    throw e;
  }
}

export async function login(input: LoginInput): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    const err = new Error(AUTH_ERROR_INVALID_CREDENTIALS);
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
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

/** Current auth fields from DB (e.g. `/api/auth/me`); keeps `emailVerified` accurate after verification. */
export async function getUserAuthProfileById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, emailVerified: true },
  });
}
