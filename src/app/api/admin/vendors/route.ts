import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { listPendingVendors, listVendorsForAdmin } from "@/services/vendor";
import { VendorStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as VendorStatus | null;
    const pendingOnly = searchParams.get("pending") === "true";
    const vendors = pendingOnly
      ? await listPendingVendors()
      : await listVendorsForAdmin(status ?? undefined);
    return NextResponse.json({ vendors });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to list vendors" }, { status });
  }
}
