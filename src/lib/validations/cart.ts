import { z } from "zod";

export const addCartItemSchema = z.object({
  productVariantId: z.string().cuid("Invalid variant id"),
  quantity: z.number().int().min(1).max(99),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

export const checkoutSchema = z.object({
  addressId: z.string().cuid("Invalid address id"),
  shippingMethod: z.string().trim().max(120).optional().or(z.literal("")),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
