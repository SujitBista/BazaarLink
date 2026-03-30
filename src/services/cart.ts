import { prisma } from "@/lib/db";
import { ProductStatus, VendorStatus } from "@prisma/client";
import { toPublicProductVendor } from "@/services/vendor";

type ServiceError = Error & { statusCode?: number; code?: string };

function createServiceError(message: string, statusCode: number, code: string): never {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  err.code = code;
  throw err;
}

const cartInclude = {
  items: {
    include: {
      productVariant: {
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
              vendor: { include: { profile: true } },
            },
          },
        },
      },
    },
  },
} as const;

export async function getCartWithItems(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: cartInclude,
  });
  if (!cart) {
    await prisma.cart.create({ data: { userId } });
    cart = await prisma.cart.findUniqueOrThrow({
      where: { userId },
      include: cartInclude,
    });
  }
  return cart;
}

export async function addCartItem(userId: string, productVariantId: string, quantity: number) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: productVariantId },
    include: { product: { include: { vendor: true } } },
  });
  if (!variant) {
    createServiceError("Product variant not found", 404, "VARIANT_NOT_FOUND");
  }
  if (variant.product.status !== ProductStatus.ACTIVE) {
    createServiceError("Product is not available", 400, "PRODUCT_NOT_ACTIVE");
  }
  if (variant.product.vendor.status !== VendorStatus.APPROVED) {
    createServiceError("Product is not available", 400, "VENDOR_NOT_APPROVED");
  }
  if (variant.stock < quantity) {
    createServiceError("Insufficient stock", 409, "INSUFFICIENT_STOCK");
  }

  const cart = await getCartWithItems(userId);
  const existing = cart.items.find((i) => i.productVariantId === productVariantId);
  const newQty = (existing?.quantity ?? 0) + quantity;
  if (variant.stock < newQty) {
    createServiceError("Insufficient stock", 409, "INSUFFICIENT_STOCK");
  }

  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty },
      include: cartInclude.items.include,
    });
  }
  return prisma.cartItem.create({
    data: { cartId: cart.id, productVariantId, quantity },
    include: cartInclude.items.include,
  });
}

export async function updateCartItemQuantity(userId: string, cartItemId: string, quantity: number) {
  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cart: { userId } },
    include: { productVariant: true },
  });
  if (!item) {
    createServiceError("Cart item not found", 404, "CART_ITEM_NOT_FOUND");
  }
  if (item.productVariant.stock < quantity) {
    createServiceError("Insufficient stock", 409, "INSUFFICIENT_STOCK");
  }
  return prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
    include: cartInclude.items.include,
  });
}

export async function removeCartItem(userId: string, cartItemId: string) {
  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cart: { userId } },
  });
  if (!item) {
    createServiceError("Cart item not found", 404, "CART_ITEM_NOT_FOUND");
  }
  await prisma.cartItem.delete({ where: { id: cartItemId } });
}

function sanitizeLine<
  T extends {
    productVariant: {
      product: { vendor: { id: string; profile: { businessName: string } | null } };
    };
  },
>(item: T) {
  return {
    ...item,
    productVariant: {
      ...item.productVariant,
      product: {
        ...item.productVariant.product,
        vendor: toPublicProductVendor(item.productVariant.product.vendor),
      },
    },
  };
}

/** Strip vendor PII from cart API responses. */
export function sanitizeCartForClient(cart: Awaited<ReturnType<typeof getCartWithItems>>) {
  return {
    ...cart,
    items: cart.items.map((item) => sanitizeLine(item)),
  };
}

export function sanitizeCartItemLine<
  T extends {
    productVariant: {
      product: { vendor: { id: string; profile: { businessName: string } | null } };
    };
  },
>(item: T) {
  return sanitizeLine(item);
}
