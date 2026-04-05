import { NextResponse } from "next/server";
import { requireCustomerForCartCheckout } from "@/lib/auth/rbac";
import { getCheckoutPaymentState } from "@/services/payment";
import { fromServiceError, validationError } from "@/lib/api/errors";
import { z } from "zod";

const orderIdParamSchema = z.object({
  orderId: z.string().cuid("Invalid order id"),
});

export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await requireCustomerForCartCheckout();
    const { orderId } = await params;
    const parsed = orderIdParamSchema.safeParse({ orderId });
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const state = await getCheckoutPaymentState(parsed.data.orderId, user.id);
    return NextResponse.json(state);
  } catch (e) {
    return fromServiceError(e, { error: "Could not load payment", code: "PAYMENT_STATE_FAILED" });
  }
}
