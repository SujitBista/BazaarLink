import { cookies } from "next/headers";
import type { SessionUser } from "@/types/api";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth/session-core";

export { COOKIE_NAME, createSession, verifySessionToken } from "@/lib/auth/session-core";

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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
