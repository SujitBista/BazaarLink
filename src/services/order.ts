import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { OrderItemStatus, OrderStatus, PaymentStatus, ProductStatus, VendorStatus } from "@prisma/client";
import type { OrderItem } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getAddressOwnedByUser } from "@/services/address";
import { getCartWithItems } from "@/services/cart";
import { getDefaultCommissionPercent, getDefaultShippingAmount } from "@/config/env";

type ServiceError = Error & { statusCode?: number; code?: string };

function createServiceError(message: string, statusCode: number, code: string): never {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  err.code = code;
  throw err;
}

function toDecimal(n: number): Decimal {
  return new Decimal(n);
}

export async function checkoutCart(userId: string, addressId: string, shippingMethod?: string | null) {
  const address = await getAddressOwnedByUser(addressId, userId);
  if (!address) {
    createServiceError("Address not found", 404, "ADDRESS_NOT_FOUND");
  }

  const cart = await getCartWithItems(userId);
  if (cart.items.length === 0) {
    createServiceError("Cart is empty", 400, "CART_EMPTY");
  }

  const lines: { variantId: string; vendorId: string; quantity: number; unitPrice: Decimal }[] = [];
  let subtotal = new Decimal(0);

  for (const item of cart.items) {
    const v = await prisma.productVariant.findUnique({
      where: { id: item.productVariantId },
      include: { product: { include: { vendor: true } } },
    });
    if (!v) {
      createServiceError("A product in your cart is no longer available", 400, "VARIANT_GONE");
    }
    if (v.product.status !== ProductStatus.ACTIVE || v.product.vendor.status !== VendorStatus.APPROVED) {
      createServiceError("A product in your cart is no longer available", 400, "PRODUCT_UNAVAILABLE");
    }
    if (v.stock < item.quantity) {
      createServiceError("Insufficient stock for an item in your cart", 409, "INSUFFICIENT_STOCK");
    }
    const lineTotal = v.price.mul(item.quantity);
    subtotal = subtotal.add(lineTotal);
    lines.push({
      variantId: v.id,
      vendorId: v.product.vendorId,
      quantity: item.quantity,
      unitPrice: v.price,
    });
  }

  const shipping = toDecimal(getDefaultShippingAmount());
  const total = subtotal.add(shipping);

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        userId,
        status: OrderStatus.PENDING,
        subtotalAmount: subtotal,
        shippingAmount: shipping,
        shippingMethod: shippingMethod?.trim() || null,
        totalAmount: total,
        shippingAddressId: addressId,
        items: {
          create: lines.map((line) => ({
            productVariantId: line.variantId,
            vendorId: line.vendorId,
            quantity: line.quantity,
            price: line.unitPrice,
            status: OrderItemStatus.PENDING,
          })),
        },
      },
      include: { items: true },
    });

    for (const line of lines) {
      await tx.productVariant.update({
        where: { id: line.variantId },
        data: { stock: { decrement: line.quantity } },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return o;
  });

  return order;
}

/**
 * When the customer abandons payment (e.g. eSewa failure URL), cancel pending payments,
 * restock reserved inventory, merge order lines back into the cart, and mark the order CANCELLED.
 * Idempotent if the order is already CANCELLED.
 */
export async function releasePendingOrderAfterAbandonedPayment(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });
  if (!order) {
    createServiceError("Order not found", 404, "ORDER_NOT_FOUND");
  }
  if (order.status === OrderStatus.CANCELLED) {
    return;
  }
  if (order.status !== OrderStatus.PENDING) {
    createServiceError("Order cannot be cancelled in current state", 409, "ORDER_NOT_CANCELLABLE");
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { orderId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.CANCELLED },
    });

    let cart = await tx.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await tx.cart.create({ data: { userId } });
    }

    for (const line of order.items) {
      await tx.productVariant.update({
        where: { id: line.productVariantId },
        data: { stock: { increment: line.quantity } },
      });

      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_productVariantId: {
            cartId: cart.id,
            productVariantId: line.productVariantId,
          },
        },
      });
      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + line.quantity },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productVariantId: line.productVariantId,
            quantity: line.quantity,
          },
        });
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });
  });
}

/** Records commissions and moves order to PAID; idempotent if order is already PAID. */
export async function finalizeOrderAsPaidInTransaction(
  tx: Prisma.TransactionClient,
  orderId: string,
  items: OrderItem[]
) {
  const transitioned = await tx.order.updateMany({
    where: { id: orderId, status: OrderStatus.PENDING },
    data: { status: OrderStatus.PAID },
  });
  if (transitioned.count === 0) {
    return;
  }

  await tx.orderItem.updateMany({
    where: { orderId },
    data: { status: OrderItemStatus.CONFIRMED },
  });

  const pct = getDefaultCommissionPercent();
  const pctDec = toDecimal(pct);
  const vendorTotals = new Map<string, Decimal>();
  for (const item of items) {
    const lineTotal = item.price.mul(item.quantity);
    const prev = vendorTotals.get(item.vendorId) ?? new Decimal(0);
    vendorTotals.set(item.vendorId, prev.add(lineTotal));
  }

  for (const [vendorId, gross] of Array.from(vendorTotals.entries())) {
    const commissionAmount = gross.mul(pctDec).div(toDecimal(100));
    await tx.commission.create({
      data: {
        orderId,
        vendorId,
        amount: commissionAmount,
        percentage: pctDec,
      },
    });
  }
}

export async function finalizeOrderAsPaid(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    createServiceError("Order not found", 404, "ORDER_NOT_FOUND");
  }
  if (order.status === OrderStatus.PAID) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, commissions: true },
    });
  }
  if (order.status !== OrderStatus.PENDING) {
    createServiceError("Order cannot be paid in current state", 409, "INVALID_ORDER_STATE");
  }

  await prisma.$transaction(async (tx) => {
    await finalizeOrderAsPaidInTransaction(tx, orderId, order.items);
  });

  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, commissions: true },
  });
}

export async function confirmOrderPayment(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });
  if (!order) {
    createServiceError("Order not found", 404, "ORDER_NOT_FOUND");
  }
  if (order.status === OrderStatus.PAID) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, commissions: true },
    });
  }
  if (order.status !== OrderStatus.PENDING) {
    createServiceError("Order cannot be paid in current state", 409, "INVALID_ORDER_STATE");
  }

  return finalizeOrderAsPaid(orderId);
}

export async function listOrdersForCustomer(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { productVariant: { include: { product: true } } } },
      shippingAddress: true,
    },
  });
}

export async function getOrderForCustomer(orderId: string, userId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: { include: { productVariant: { include: { product: true } } } },
      shippingAddress: true,
      commissions: true,
    },
  });
}

export async function listOrderItemsForVendor(vendorId: string, userId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, userId },
  });
  if (!vendor) {
    createServiceError("Vendor not found", 404, "VENDOR_NOT_FOUND");
  }

  return prisma.orderItem.findMany({
    where: { vendorId },
    orderBy: { createdAt: "desc" },
    include: {
      order: { include: { user: { select: { email: true } }, shippingAddress: true } },
      productVariant: { include: { product: true } },
    },
  });
}
