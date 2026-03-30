import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { confirmOrderPayment } from "@/services/order";
import { fromServiceError, validationError } from "@/lib/api/errors";
import { z } from "zod";

const orderIdParamSchema = z.object({
  orderId: z.string().cuid("Invalid order id"),
});

/** Simulated payment capture (replace with PSP webhook in production). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await requireAuth();
    const { orderId } = await params;
    const parsed = orderIdParamSchema.safeParse({ orderId });
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const order = await confirmOrderPayment(parsed.data.orderId, user.id);
    return NextResponse.json({ order });
  } catch (e) {
    return fromServiceError(e, { error: "Payment failed", code: "PAYMENT_FAILED" });
  }
}
