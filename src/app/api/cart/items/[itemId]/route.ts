import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { removeCartItem, sanitizeCartItemLine, updateCartItemQuantity } from "@/services/cart";
import { updateCartItemSchema } from "@/lib/validations/cart";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";
import { z } from "zod";

const itemIdParamSchema = z.object({
  itemId: z.string().cuid("Invalid cart item id"),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { itemId } = await params;
    const idParsed = itemIdParamSchema.safeParse({ itemId });
    if (!idParsed.success) {
      return validationError(idParsed.error.flatten());
    }
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const parsed = updateCartItemSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const item = sanitizeCartItemLine(
      await updateCartItemQuantity(user.id, idParsed.data.itemId, parsed.data.quantity)
    );
    return NextResponse.json({ item });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to update cart item", code: "UPDATE_CART_ITEM_FAILED" });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { itemId } = await params;
    const idParsed = itemIdParamSchema.safeParse({ itemId });
    if (!idParsed.success) {
      return validationError(idParsed.error.flatten());
    }
    await removeCartItem(user.id, idParsed.data.itemId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to remove cart item", code: "REMOVE_CART_ITEM_FAILED" });
  }
}
