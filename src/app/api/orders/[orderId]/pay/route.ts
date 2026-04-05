import { NextResponse } from "next/server";
import { requireCustomerForCartCheckout } from "@/lib/auth/rbac";
import { confirmOrderPayment } from "@/services/order";
import { isMockPaymentEnabled } from "@/config/env";
import { fromServiceError, validationError } from "@/lib/api/errors";
import { z } from "zod";

const orderIdParamSchema = z.object({
  orderId: z.string().cuid("Invalid order id"),
});

/** Dev simulated capture when mock payment is enabled (see `isMockPaymentEnabled` in env.ts). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    if (!isMockPaymentEnabled()) {
      return NextResponse.json(
        { error: "Simulated payment is disabled. Use Pay with eSewa from checkout.", code: "MOCK_PAYMENT_DISABLED" },
        { status: 404 }
      );
    }
    const user = await requireCustomerForCartCheckout();
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
