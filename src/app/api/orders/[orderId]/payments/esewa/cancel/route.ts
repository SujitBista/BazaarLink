import { NextResponse } from "next/server";
import { requireCustomerForCartCheckout } from "@/lib/auth/rbac";
import { markLatestPaymentCancelled } from "@/services/payment";
import { fromServiceError, validationError } from "@/lib/api/errors";
import { z } from "zod";

const orderIdParamSchema = z.object({
  orderId: z.string().cuid("Invalid order id"),
});

/** Marks pending eSewa attempts cancelled after customer returns from failure URL. */
export async function POST(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await requireCustomerForCartCheckout();
    const { orderId } = await params;
    const parsed = orderIdParamSchema.safeParse({ orderId });
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    await markLatestPaymentCancelled(parsed.data.orderId, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fromServiceError(e, { error: "Could not update payment", code: "PAYMENT_CANCEL_FAILED" });
  }
}
