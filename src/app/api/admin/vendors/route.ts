import { NextResponse } from "next/server";
import { VendorStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/rbac";
import { getAdminVendorStatusCounts, listVendorsForAdminQuery } from "@/services/vendor";
import { adminListVendorsQuerySchema } from "@/lib/validations/vendor";
import { fromServiceError, validationError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const parsed = adminListVendorsQuerySchema.safeParse({
      pending: searchParams.get("pending") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
    });

    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    const { pending, status, q, sort } = parsed.data;

    const vendors = await listVendorsForAdminQuery({
      pending: !!pending,
      status: (status as VendorStatus | "ALL" | undefined) ?? "ALL",
      q,
      sort,
    });
    const counts = await getAdminVendorStatusCounts();
    return NextResponse.json({ vendors, counts });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to list vendors", code: "LIST_VENDORS_FAILED" });
  }
}
