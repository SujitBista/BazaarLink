import { NextResponse } from "next/server";
import { confirmEmailVerification } from "@/services/auth";
import { confirmEmailVerificationSchema } from "@/lib/validations/auth";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = confirmEmailVerificationSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    await confirmEmailVerification(parsed.data.token);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to verify email", code: "VERIFY_CONFIRM_FAILED" });
  }
}
