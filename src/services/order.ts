import { prisma } from "@/lib/db";
import { OrderItemStatus, OrderStatus, ProductStatus, VendorStatus } from "@prisma/client";
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

  const pct = getDefaultCommissionPercent();
  const pctDec = toDecimal(pct);

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
    });
    await tx.orderItem.updateMany({
      where: { orderId },
      data: { status: OrderItemStatus.CONFIRMED },
    });

    const vendorTotals = new Map<string, Decimal>();
    for (const item of order.items) {
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
  });

  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, commissions: true },
  });
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
