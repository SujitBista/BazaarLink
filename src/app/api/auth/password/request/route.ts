import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/services/auth";
import { passwordResetRequestSchema } from "@/lib/validations/auth";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = passwordResetRequestSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    const result = await requestPasswordReset(parsed.data.email);
    return NextResponse.json({
      ok: true,
      ...(process.env.NODE_ENV !== "production" ? { token: result.token } : {}),
    });
  } catch (e) {
    return fromServiceError(e, {
      error: "Failed to request password reset",
      code: "PASSWORD_RESET_REQUEST_FAILED",
    });
  }
}
