import { NextResponse } from "next/server";
import { requireCustomerForCartCheckout } from "@/lib/auth/rbac";
import { addCartItem, sanitizeCartItemLine } from "@/services/cart";
import { addCartItemSchema } from "@/lib/validations/cart";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const user = await requireCustomerForCartCheckout();
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const parsed = addCartItemSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const item = sanitizeCartItemLine(await addCartItem(user.id, parsed.data.productVariantId, parsed.data.quantity));
    return NextResponse.json({ item });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to add to cart", code: "ADD_CART_ITEM_FAILED" });
  }
}
