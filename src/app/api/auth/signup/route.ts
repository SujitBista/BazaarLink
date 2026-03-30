import { NextResponse } from "next/server";
import { requestEmailVerification, signupWithSession } from "@/services/auth";
import { signupSchema } from "@/lib/validations/auth";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";
import { getRequestOrigin } from "@/lib/request-origin";
import { notifyAdminSignupPendingVerification } from "@/lib/admin-notify";

export async function POST(request: Request) {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const intent = parsed.data.intent === "vendor" ? "vendor" : "customer";
    const user = await signupWithSession(parsed.data);
    const { token } = await requestEmailVerification(parsed.data.email);

    let devVerificationUrl: string | undefined;
    if (token) {
      const origin = getRequestOrigin(request);
      const nextPath = intent === "vendor" ? "/vendor/onboarding" : "/";
      const verificationUrl = `${origin}/auth/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`;
      notifyAdminSignupPendingVerification(parsed.data.email, { verificationUrl, intent });
      if (process.env.NODE_ENV !== "production") {
        devVerificationUrl = verificationUrl;
      }
    }

    return NextResponse.json({
      user,
      verification: {
        sent: Boolean(token),
        ...(devVerificationUrl ? { devVerificationUrl } : {}),
      },
    });
  } catch (e) {
    return fromServiceError(e, { error: "Signup failed", code: "SIGNUP_FAILED" });
  }
}
