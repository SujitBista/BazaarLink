import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { listPendingVendors, listVendorsForAdmin } from "@/services/vendor";
import { adminListVendorsQuerySchema } from "@/lib/validations/vendor";
import { fromServiceError, validationError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const parsed = adminListVendorsQuerySchema.safeParse({
      pending: searchParams.get("pending") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    const vendors = parsed.data.pending
      ? await listPendingVendors()
      : await listVendorsForAdmin(parsed.data.status);
    return NextResponse.json({ vendors });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to list vendors", code: "LIST_VENDORS_FAILED" });
  }
}
