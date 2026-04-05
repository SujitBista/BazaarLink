import { prisma } from "@/lib/db";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  getEsewaProductCode,
  getEsewaSecretKey,
  getEsewaFormUrl,
  getEsewaStatusUrl,
  getPublicAppUrl,
} from "@/config/env";
import {
  buildEsewaRequestSigningMessage,
  decodeEsewaBase64Payload,
  generateEsewaTransactionUuid,
  signEsewaMessage,
  verifyEsewaResponseSignature,
} from "@/lib/payments/esewa";
import { finalizeOrderAsPaidInTransaction, releasePendingOrderAfterAbandonedPayment } from "@/services/order";

type ServiceError = Error & { statusCode?: number; code?: string };

function createServiceError(message: string, statusCode: number, code: string): never {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  err.code = code;
  throw err;
}

function formatEsewaAmount(total: Decimal): string {
  return total.toFixed(2);
}

function decimalMatchesEsewaTotal(orderTotal: Decimal, esewaTotal: unknown): boolean {
  const n =
    typeof esewaTotal === "number"
      ? esewaTotal
      : typeof esewaTotal === "string"
        ? Number.parseFloat(esewaTotal)
        : NaN;
  if (!Number.isFinite(n)) return false;
  return orderTotal.sub(new Decimal(n)).abs().lt(new Decimal("0.01"));
}

/** Outcome of eSewa transaction status enquiry (GET). */
type EsewaStatusEnquiry =
  | { kind: "complete" }
  | { kind: "not_complete"; status: string }
  | { kind: "unavailable" };

/**
 * Calls eSewa's status URL. Never throws: network/HTTP failures return `unavailable`.
 * Per eSewa docs, this enquiry is for cases where the redirect response was not received;
 * if it is unreachable after we already verified the signed success payload, we may still complete.
 */
async function queryEsewaTransactionStatus(
  productCode: string,
  totalAmount: string,
  transactionUuid: string
): Promise<EsewaStatusEnquiry> {
  const base = getEsewaStatusUrl();
  const url = new URL(base);
  url.searchParams.set("product_code", productCode);
  url.searchParams.set("total_amount", totalAmount);
  url.searchParams.set("transaction_uuid", transactionUuid);

  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: "no-store" });
  } catch {
    return { kind: "unavailable" };
  }

  if (!res.ok) {
    return { kind: "unavailable" };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { kind: "unavailable" };
  }

  if (!body || typeof body !== "object") {
    return { kind: "unavailable" };
  }

  const rec = body as Record<string, unknown>;
  if ("code" in rec && rec.code === 0) {
    return { kind: "unavailable" };
  }

  const remoteStatus = String(rec.status ?? "").toUpperCase();
  if (!remoteStatus) {
    return { kind: "unavailable" };
  }

  if (remoteStatus === "COMPLETE") {
    return { kind: "complete" };
  }

  return { kind: "not_complete", status: remoteStatus };
}

export async function getCheckoutPaymentState(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      status: true,
      totalAmount: true,
    },
  });
  if (!order) {
    createServiceError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  const latestPayment = await prisma.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      amount: true,
      transactionUuid: true,
      externalId: true,
      createdAt: true,
    },
  });

  return {
    order: {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount.toFixed(2),
    },
    payment: latestPayment
      ? {
          id: latestPayment.id,
          status: latestPayment.status,
          amount: latestPayment.amount.toFixed(2),
          transactionUuid: latestPayment.transactionUuid,
          externalId: latestPayment.externalId,
          createdAt: latestPayment.createdAt.toISOString(),
        }
      : null,
  };
}

export async function initiateEsewaPayment(orderId: string, userId: string) {
  let productCode: string;
  let secret: string;
  try {
    productCode = getEsewaProductCode();
    secret = getEsewaSecretKey();
  } catch {
    createServiceError("Payment is not configured. Please try again later.", 503, "ESEWA_NOT_CONFIGURED");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) {
    createServiceError("Order not found", 404, "ORDER_NOT_FOUND");
  }
  if (order.status !== OrderStatus.PENDING) {
    createServiceError("This order cannot be paid", 409, "ORDER_NOT_PAYABLE");
  }

  const totalStr = formatEsewaAmount(order.totalAmount);

  let payment = await prisma.payment.findFirst({
    where: { orderId, status: PaymentStatus.PENDING },
    orderBy: { createdAt: "desc" },
  });

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
        transactionUuid: generateEsewaTransactionUuid(),
      },
    });
  } else if (!order.totalAmount.equals(payment.amount)) {
    payment = await prisma.payment.create({
      data: {
        orderId,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
        transactionUuid: generateEsewaTransactionUuid(),
      },
    });
  }

  const msg = buildEsewaRequestSigningMessage(totalStr, payment.transactionUuid, productCode);
  const signature = signEsewaMessage(msg, secret);
  const base = getPublicAppUrl();

  return {
    formAction: getEsewaFormUrl(),
    fields: {
      amount: totalStr,
      tax_amount: "0",
      product_service_charge: "0",
      product_delivery_charge: "0",
      total_amount: totalStr,
      transaction_uuid: payment.transactionUuid,
      product_code: productCode,
      success_url: `${base}/checkout/payment/esewa`,
      failure_url: `${base}/checkout/payment/esewa?failure=1&orderId=${encodeURIComponent(orderId)}`,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature,
    },
    payment: {
      id: payment.id,
      transactionUuid: payment.transactionUuid,
      status: payment.status,
    },
  };
}

export async function verifyEsewaReturnAndCompleteOrder(data: string | undefined, userId: string) {
  if (!data?.trim()) {
    createServiceError("Missing payment data", 400, "ESEWA_MISSING_DATA");
  }

  let secret: string;
  try {
    secret = getEsewaSecretKey();
  } catch {
    createServiceError("Payment is not configured", 503, "ESEWA_NOT_CONFIGURED");
  }

  const payload = decodeEsewaBase64Payload(data.trim());
  if (!payload) {
    createServiceError("Invalid payment payload", 400, "ESEWA_INVALID_PAYLOAD");
  }

  if (!verifyEsewaResponseSignature(payload, secret)) {
    createServiceError("Invalid payment signature", 400, "ESEWA_BAD_SIGNATURE");
  }

  const status = String(payload.status ?? "").toUpperCase();
  if (status !== "COMPLETE") {
    createServiceError("Payment was not completed", 409, "ESEWA_NOT_COMPLETE");
  }

  let productCode: string;
  try {
    productCode = getEsewaProductCode();
  } catch {
    createServiceError("Payment is not configured", 503, "ESEWA_NOT_CONFIGURED");
  }

  if (payload.product_code && payload.product_code !== productCode) {
    createServiceError("Payment product mismatch", 400, "ESEWA_PRODUCT_MISMATCH");
  }

  const transactionUuid = payload.transaction_uuid?.trim();
  if (!transactionUuid) {
    createServiceError("Missing transaction reference", 400, "ESEWA_MISSING_UUID");
  }

  const paymentRow = await prisma.payment.findUnique({
    where: { transactionUuid },
    include: {
      order: { include: { items: true } },
    },
  });

  if (!paymentRow) {
    createServiceError("Payment attempt not found", 404, "PAYMENT_NOT_FOUND");
  }

  if (paymentRow.order.userId !== userId) {
    createServiceError("Forbidden", 403, "FORBIDDEN");
  }

  if (!decimalMatchesEsewaTotal(paymentRow.order.totalAmount, payload.total_amount)) {
    createServiceError("Amount mismatch for this order", 400, "ESEWA_AMOUNT_MISMATCH");
  }

  const totalStr = formatEsewaAmount(paymentRow.order.totalAmount);
  const enquiry = await queryEsewaTransactionStatus(productCode, totalStr, transactionUuid);
  if (enquiry.kind === "not_complete") {
    createServiceError(
      "eSewa could not confirm this payment yet. Please try again or contact support.",
      409,
      "ESEWA_REMOTE_PENDING",
    );
  }
  // `unavailable`: status API unreachable or errored — redirect payload is already HMAC-verified COMPLETE.

  const externalId = payload.transaction_code?.trim() ?? null;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: paymentRow.id, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.SUCCEEDED,
        externalId: externalId ?? undefined,
      },
    });

    if (updated.count === 0) {
      const current = await tx.payment.findUnique({
        where: { id: paymentRow.id },
        include: { order: { include: { items: true } } },
      });
      if (current?.status === PaymentStatus.SUCCEEDED) {
        await finalizeOrderAsPaidInTransaction(tx, current.orderId, current.order.items);
        return;
      }
      createServiceError("Payment is in an unexpected state", 409, "PAYMENT_STATE");
    }

    await finalizeOrderAsPaidInTransaction(tx, paymentRow.orderId, paymentRow.order.items);
  });

  const order = await prisma.order.findUnique({
    where: { id: paymentRow.orderId },
    include: { items: true, commissions: true },
  });

  return { order, paymentId: paymentRow.id };
}

export async function markLatestPaymentCancelled(orderId: string, userId: string) {
  await releasePendingOrderAfterAbandonedPayment(orderId, userId);
}
