import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { SessionUser } from "@/types/api";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth/session-core";

export { COOKIE_NAME, createSession, verifySessionToken } from "@/lib/auth/session-core";

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: MAX_AGE,
  path: "/",
};

/** Use in Route Handlers that return `NextResponse.redirect` — `cookies().set` may not attach to that response. */
export function attachSessionCookieToResponse(response: NextResponse, sessionToken: string): void {
  response.cookies.set(COOKIE_NAME, sessionToken, sessionCookieOptions);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, sessionCookieOptions);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
