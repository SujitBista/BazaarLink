import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { suspendVendor } from "@/services/vendor";
import { vendorIdParamSchema } from "@/lib/validations/vendor";
import { fromServiceError, validationError } from "@/lib/api/errors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    await requireAdmin();
    const { vendorId } = await params;
    const parsed = vendorIdParamSchema.safeParse({ vendorId });
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    const vendor = await suspendVendor(parsed.data.vendorId);
    return NextResponse.json({ vendor });
  } catch (e) {
    return fromServiceError(e, { error: "Suspend failed", code: "SUSPEND_VENDOR_FAILED" });
  }
}
