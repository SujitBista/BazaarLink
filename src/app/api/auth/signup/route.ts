import { NextResponse } from "next/server";
import { signupWithSession } from "@/services/auth";
import { signupSchema } from "@/lib/validations/auth";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const user = await signupWithSession(parsed.data);
    return NextResponse.json({ user });
  } catch (e) {
    return fromServiceError(e, { error: "Signup failed", code: "SIGNUP_FAILED" });
  }
}
