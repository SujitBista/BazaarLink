import { NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";
import { requireAuth } from "@/lib/auth/rbac";
import { getCartWithItems, sanitizeCartForClient } from "@/services/cart";
import { getDefaultShippingAmount } from "@/config/env";
import { fromServiceError } from "@/lib/api/errors";

function buildCartSummary(cart: Awaited<ReturnType<typeof sanitizeCartForClient>>) {
  let subtotal = new Decimal(0);
  for (const item of cart.items) {
    subtotal = subtotal.add(new Decimal(item.productVariant.price).mul(item.quantity));
  }
  const shipping =
    cart.items.length === 0 ? new Decimal(0) : new Decimal(getDefaultShippingAmount());
  const tax = new Decimal(0);
  const total = subtotal.add(shipping).add(tax);
  return {
    subtotal: subtotal.toFixed(2),
    shipping: shipping.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
  };
}

export async function GET() {
  try {
    const user = await requireAuth();
    const cart = sanitizeCartForClient(await getCartWithItems(user.id));
    const summary = buildCartSummary(cart);
    return NextResponse.json({ cart, summary });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to load cart", code: "GET_CART_FAILED" });
  }
}
