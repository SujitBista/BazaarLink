import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { approveVendor } from "@/services/vendor";
import { adminApproveVendorBodySchema, vendorIdParamSchema } from "@/lib/validations/vendor";
import { fromServiceError, validationError } from "@/lib/api/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const user = await requireAdmin();
    const { vendorId } = await params;
    const parsed = vendorIdParamSchema.safeParse({ vendorId });
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const payload = adminApproveVendorBodySchema.safeParse(body ?? {});
    if (!payload.success) {
      return validationError(payload.error.flatten());
    }

    const vendor = await approveVendor(parsed.data.vendorId, user.id, {
      note: payload.data.note,
    });
    return NextResponse.json({ vendor });
  } catch (e) {
    return fromServiceError(e, { error: "Approval failed", code: "APPROVE_VENDOR_FAILED" });
  }
}
