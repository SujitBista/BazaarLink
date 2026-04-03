import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth/rbac";
import { getOrderForCustomer } from "@/services/order";
import { fromServiceError, validationError } from "@/lib/api/errors";
import { z } from "zod";

const orderIdParamSchema = z.object({
  orderId: z.string().cuid("Invalid order id"),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await requireCustomer();
    const { orderId } = await params;
    const parsed = orderIdParamSchema.safeParse({ orderId });
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const order = await getOrderForCustomer(parsed.data.orderId, user.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found", code: "ORDER_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to get order", code: "GET_ORDER_FAILED" });
  }
}
