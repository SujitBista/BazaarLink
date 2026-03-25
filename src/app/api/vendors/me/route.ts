import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { getVendorByUserId, toNonAdminVendorResponse } from "@/services/vendor";

export async function GET() {
  try {
    const user = await requireAuth();
    const vendor = await getVendorByUserId(user.id);
    if (!vendor) {
      return NextResponse.json({ vendor: null }, { status: 200 });
    }
    return NextResponse.json({ vendor: toNonAdminVendorResponse(vendor) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to get vendor" }, { status });
  }
}
