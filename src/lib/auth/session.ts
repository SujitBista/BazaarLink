import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionUser } from "@/types/api";
import { getSessionSecret } from "@/config/env";

const COOKIE_NAME = "bazaar_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSession(user: SessionUser): Promise<string> {
  const secret = new TextEncoder().encode(getSessionSecret());
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(MAX_AGE)
    .setIssuedAt()
    .sign(secret);
  return token;
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const secret = new TextEncoder().encode(getSessionSecret());
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as SessionUser["role"],
      emailVerified: Boolean(payload.emailVerified),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
