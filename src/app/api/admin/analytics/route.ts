import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { fromServiceError } from "@/lib/api/errors";

export async function GET() {
  try {
    await requireAdmin();
    const [userCount, orderCount, vendorCount, productCount, paidRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.vendor.count(),
      prisma.product.count(),
      prisma.order.aggregate({
        where: { status: "PAID" },
        _sum: { totalAmount: true },
      }),
    ]);
    return NextResponse.json({
      users: userCount,
      orders: orderCount,
      vendors: vendorCount,
      products: productCount,
      paidRevenueTotal: paidRevenue._sum.totalAmount?.toString() ?? "0",
    });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to load analytics", code: "ADMIN_ANALYTICS_FAILED" });
  }
}
