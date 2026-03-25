import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { submitVendorOnboarding, toNonAdminVendorResponse } from "@/services/vendor";
import { registerVendorSchema } from "@/lib/validations/vendor";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = registerVendorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const vendor = await submitVendorOnboarding(user.id, parsed.data);

    // Refresh session so CUSTOMER -> VENDOR role changes apply immediately.
    const updatedToken = await createSession({
      id: user.id,
      email: user.email,
      role: "VENDOR",
      emailVerified: user.emailVerified,
    });
    await setSessionCookie(updatedToken);

    return NextResponse.json({ vendor: toNonAdminVendorResponse(vendor) });
  } catch (e) {
    const err = e as Error & { statusCode?: number; code?: string };
    const status = err.statusCode ?? 500;
    return NextResponse.json(
      {
        error: err.message ?? "Vendor onboarding failed",
        code: err.code ?? "VENDOR_ONBOARDING_FAILED",
      },
      { status }
    );
  }
}
