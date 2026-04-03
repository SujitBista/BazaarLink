import { NextResponse } from "next/server";
import { requestEmailVerification, signupCustomerWithSession } from "@/services/auth";
import { vendorIntentSignupSchema } from "@/lib/validations/auth";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";
import { getRequestOrigin } from "@/lib/request-origin";
import { notifyAdminSignupPendingVerification } from "@/lib/admin-notify";

/** Seller onboarding: creates a user account (CUSTOMER role in DB) without exposing role selection. */
export async function POST(request: Request) {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const parsed = vendorIntentSignupSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const user = await signupCustomerWithSession({
      email: parsed.data.email,
      password: parsed.data.password,
      fullName: null,
    });
    const { token } = await requestEmailVerification(parsed.data.email);

    let devVerificationUrl: string | undefined;
    if (token) {
      const origin = getRequestOrigin(request);
      const nextPath = "/vendor/onboarding";
      const verificationUrl = `${origin}/auth/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`;
      notifyAdminSignupPendingVerification(parsed.data.email, { verificationUrl, intent: "vendor" });
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
