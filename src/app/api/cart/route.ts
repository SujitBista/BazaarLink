import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { getCartWithItems, sanitizeCartForClient } from "@/services/cart";
import { fromServiceError } from "@/lib/api/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const cart = sanitizeCartForClient(await getCartWithItems(user.id));
    return NextResponse.json({ cart });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to load cart", code: "GET_CART_FAILED" });
  }
}
