import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { getVendorByUserId, toVendorOwnerSelfResponse } from "@/services/vendor";
import { fromServiceError } from "@/lib/api/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const vendor = await getVendorByUserId(user.id);
    if (!vendor) {
      return NextResponse.json({ vendor: null }, { status: 200 });
    }
    return NextResponse.json({ vendor: toVendorOwnerSelfResponse(vendor) });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to get vendor", code: "GET_VENDOR_FAILED" });
  }
}
