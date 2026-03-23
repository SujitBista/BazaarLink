import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import type { SignupInput, LoginInput } from "@/lib/validations/auth";
import type { SessionUser } from "@/types/api";
import type { UserRole } from "@prisma/client";

export async function signup(input: SignupInput): Promise<SessionUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    const err = new Error("Email already registered");
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: (input.role ?? "CUSTOMER") as UserRole,
    },
  });
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

export async function login(input: LoginInput): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    const err = new Error("Invalid email or password");
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
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
