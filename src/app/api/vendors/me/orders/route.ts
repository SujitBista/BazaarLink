import { NextResponse } from "next/server";
import { requireApprovedVendor } from "@/lib/auth/rbac";
import { listOrderItemsForVendor } from "@/services/order";
import { fromServiceError } from "@/lib/api/errors";

export async function GET() {
  try {
    const { user, vendor } = await requireApprovedVendor();
    const items = await listOrderItemsForVendor(vendor.id, user.id);
    return NextResponse.json({ orderItems: items });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to list vendor orders", code: "LIST_VENDOR_ORDERS_FAILED" });
  }
}
