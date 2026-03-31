import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { getVendorForAdminById } from "@/services/vendor";
import { vendorIdParamSchema } from "@/lib/validations/vendor";
import { fromServiceError, validationError } from "@/lib/api/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ vendorId: string }> }) {
  try {
    await requireAdmin();
    const { vendorId } = await params;
    const parsed = vendorIdParamSchema.safeParse({ vendorId });
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    const vendor = await getVendorForAdminById(parsed.data.vendorId);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found", code: "VENDOR_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ vendor });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to load vendor", code: "GET_VENDOR_FAILED" });
  }
}
