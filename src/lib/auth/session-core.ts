/**
 * Edge-safe session helpers (JWT only). Middleware must import from this file — not from
 * `session.ts`, which uses `next/headers` and breaks the Edge bundle / dev server.
 */
import { SignJWT, jwtVerify } from "jose";
import type { SessionUser } from "@/types/api";
import { getSessionSecret } from "@/config/env";

export const COOKIE_NAME = "bazaar_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSession(user: SessionUser): Promise<string> {
  const secret = new TextEncoder().encode(getSessionSecret());
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE;
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
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
