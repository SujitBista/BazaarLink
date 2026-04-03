import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth/rbac";
import { listOrdersForCustomer } from "@/services/order";
import { fromServiceError } from "@/lib/api/errors";

export async function GET() {
  try {
    const user = await requireCustomer();
    const orders = await listOrdersForCustomer(user.id);
    return NextResponse.json({ orders });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to list orders", code: "LIST_ORDERS_FAILED" });
  }
}
