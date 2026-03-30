import { NextRequest, NextResponse } from "next/server";
import { confirmEmailVerification, getUserAuthProfileById } from "@/services/auth";
import { attachSessionCookieToResponse, createSession } from "@/lib/auth/session";
import { safeRelativePath } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";

/**
 * GET /auth/verify?token=...&next=/relative/path
 * Confirms email from the signed link, sets session on the redirect response, redirects to `next`.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const next = safeRelativePath(request.nextUrl.searchParams.get("next"), "/");
  const dest = new URL(next, request.nextUrl.origin);

  if (!token) {
    dest.searchParams.set("verifyError", "missing_token");
    return NextResponse.redirect(dest);
  }

  try {
    const { userId } = await confirmEmailVerification(token);
    const db = await getUserAuthProfileById(userId);
    if (!db) {
      dest.searchParams.set("verifyError", "1");
      return NextResponse.redirect(dest);
    }

    const sessionJwt = await createSession({
      id: db.id,
      email: db.email,
      role: db.role,
      emailVerified: Boolean(db.emailVerified),
    });

    dest.searchParams.set("emailVerified", "1");
    const res = NextResponse.redirect(dest);
    attachSessionCookieToResponse(res, sessionJwt);
    return res;
  } catch {
    dest.searchParams.set("verifyError", "1");
    return NextResponse.redirect(dest);
  }
}
