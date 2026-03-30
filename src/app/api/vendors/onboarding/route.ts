import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { refreshSessionForUserId } from "@/services/auth";
import { submitVendorOnboarding, toNonAdminVendorResponse } from "@/services/vendor";
import { registerVendorSchema } from "@/lib/validations/vendor";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const parsed = registerVendorSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    const vendor = await submitVendorOnboarding(user.id, parsed.data);
    await refreshSessionForUserId(user.id);

    return NextResponse.json({ vendor: toNonAdminVendorResponse(vendor) });
  } catch (e) {
    return fromServiceError(e, {
      error: "Vendor onboarding failed",
      code: "VENDOR_ONBOARDING_FAILED",
    });
  }
}
