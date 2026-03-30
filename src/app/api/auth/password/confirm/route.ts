import { NextResponse } from "next/server";
import { confirmPasswordReset } from "@/services/auth";
import { passwordResetConfirmSchema } from "@/lib/validations/auth";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = passwordResetConfirmSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    await confirmPasswordReset(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to reset password", code: "PASSWORD_RESET_CONFIRM_FAILED" });
  }
}
