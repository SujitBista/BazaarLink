import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { suspendVendor } from "@/services/vendor";
import { adminSuspendVendorSchema, vendorIdParamSchema } from "@/lib/validations/vendor";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function POST(request: Request, { params }: { params: Promise<{ vendorId: string }> }) {
  try {
    await requireAdmin();
    const { vendorId } = await params;
    const parsed = vendorIdParamSchema.safeParse({ vendorId });
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const parsedPayload = adminSuspendVendorSchema.safeParse(parsedBody.body ?? {});
    if (!parsedPayload.success) {
      return validationError(parsedPayload.error.flatten());
    }

    const vendor = await suspendVendor(parsed.data.vendorId, parsedPayload.data.rejectionReason);
    return NextResponse.json({ vendor });
  } catch (e) {
    return fromServiceError(e, { error: "Suspend failed", code: "SUSPEND_VENDOR_FAILED" });
  }
}
