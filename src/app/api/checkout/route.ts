import { NextResponse } from "next/server";
import { requireCustomerForCartCheckout } from "@/lib/auth/rbac";
import { checkoutCart } from "@/services/order";
import { checkoutSchema } from "@/lib/validations/cart";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const user = await requireCustomerForCartCheckout();
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const parsed = checkoutSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const order = await checkoutCart(user.id, parsed.data.addressId, parsed.data.shippingMethod);
    return NextResponse.json({ order });
  } catch (e) {
    return fromServiceError(e, { error: "Checkout failed", code: "CHECKOUT_FAILED" });
  }
}
