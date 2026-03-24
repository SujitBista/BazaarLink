import { NextResponse } from "next/server";
import { AUTH_ERROR_INVALID_CREDENTIALS, loginWithSession } from "@/services/auth";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const user = await loginWithSession(parsed.data);
    return NextResponse.json({ user });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    const message = status === 401 ? AUTH_ERROR_INVALID_CREDENTIALS : err.message ?? "Login failed";
    return NextResponse.json({ error: message }, { status });
  }
}
