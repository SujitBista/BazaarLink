import { NextResponse } from "next/server";
import { requireCustomerForCartCheckout } from "@/lib/auth/rbac";
import { verifyEsewaReturnAndCompleteOrder } from "@/services/payment";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";
import { z } from "zod";

const bodySchema = z.object({
  data: z.string().min(1, "Missing payment data"),
});

export async function POST(request: Request) {
  try {
    const user = await requireCustomerForCartCheckout();
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const parsed = bodySchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const result = await verifyEsewaReturnAndCompleteOrder(parsed.data.data, user.id);
    return NextResponse.json(result);
  } catch (e) {
    return fromServiceError(e, { error: "Payment verification failed", code: "ESEWA_VERIFY_FAILED" });
  }
}
