import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { listOrderItemsForVendor } from "@/services/order";
import { fromServiceError } from "@/lib/api/errors";

export async function GET() {
  try {
    const user = await requireVendor();
    const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found", code: "VENDOR_NOT_FOUND" }, { status: 404 });
    }
    const items = await listOrderItemsForVendor(vendor.id, user.id);
    return NextResponse.json({ orderItems: items });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to list vendor orders", code: "LIST_VENDOR_ORDERS_FAILED" });
  }
}
