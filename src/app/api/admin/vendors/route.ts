import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { listPendingVendors, listVendorsForAdmin } from "@/services/vendor";
import { adminListVendorsQuerySchema } from "@/lib/validations/vendor";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const parsed = adminListVendorsQuerySchema.safeParse({
      pending: searchParams.get("pending") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const vendors = parsed.data.pending
      ? await listPendingVendors()
      : await listVendorsForAdmin(parsed.data.status);
    return NextResponse.json({ vendors });
  } catch (e) {
    const err = e as Error & { statusCode?: number; code?: string };
    const status = err.statusCode ?? 500;
    return NextResponse.json(
      { error: err.message ?? "Failed to list vendors", code: err.code ?? "LIST_VENDORS_FAILED" },
      { status }
    );
  }
}
