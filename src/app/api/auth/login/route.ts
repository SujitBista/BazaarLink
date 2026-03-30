import { NextResponse } from "next/server";
import { AUTH_ERROR_INVALID_CREDENTIALS, loginWithSession } from "@/services/auth";
import { loginSchema } from "@/lib/validations/auth";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const user = await loginWithSession(parsed.data);
    return NextResponse.json({ user });
  } catch (e) {
    return fromServiceError(e, { error: AUTH_ERROR_INVALID_CREDENTIALS, code: "LOGIN_FAILED" });
  }
}
