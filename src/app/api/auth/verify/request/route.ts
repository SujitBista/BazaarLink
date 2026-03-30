import { NextResponse } from "next/server";
import { requestEmailVerification } from "@/services/auth";
import { requestEmailVerificationSchema } from "@/lib/validations/auth";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = requestEmailVerificationSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    const result = await requestEmailVerification(parsed.data.email);
    return NextResponse.json({
      ok: true,
      ...(process.env.NODE_ENV !== "production" ? { token: result.token } : {}),
    });
  } catch (e) {
    return fromServiceError(e, {
      error: "Failed to request email verification",
      code: "VERIFY_REQUEST_FAILED",
    });
  }
}
