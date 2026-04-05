import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * eSewa requires transaction_uuid to be alphanumeric (and optionally hyphen). Demo IDs are
 * hex-only; avoid UUID hyphens for maximum compatibility with their gateway.
 */
export function generateEsewaTransactionUuid(): string {
  return randomBytes(16).toString("hex");
}

/**
 * eSewa ePay v2 request signing (HMAC SHA256, base64).
 * Message format: total_amount=X,transaction_uuid=Y,product_code=Z
 */
export function buildEsewaRequestSigningMessage(
  totalAmount: string,
  transactionUuid: string,
  productCode: string
): string {
  return `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
}

export function signEsewaMessage(message: string, secretKey: string): string {
  return createHmac("sha256", secretKey).update(message, "utf8").digest("base64");
}

export type EsewaDecodedSuccessPayload = {
  status?: string;
  signature?: string;
  transaction_code?: string;
  total_amount?: number | string;
  transaction_uuid?: string;
  product_code?: string;
  signed_field_names?: string;
  success_url?: string;
};

function normalizeEsewaScalar(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (typeof value === "string") return value;
  return "";
}

/**
 * Verifies redirect payload signature using `signed_field_names` order from eSewa.
 */
export function verifyEsewaResponseSignature(payload: EsewaDecodedSuccessPayload, secretKey: string): boolean {
  const sig = payload.signature;
  const signedNamesRaw = payload.signed_field_names;
  if (!sig || !signedNamesRaw) return false;

  const names = signedNamesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const record = payload as Record<string, unknown>;
  const parts: string[] = [];
  for (const name of names) {
    if (name === "signature") continue;
    const v = record[name];
    parts.push(`${name}=${normalizeEsewaScalar(v)}`);
  }
  const message = parts.join(",");
  const expected = signEsewaMessage(message, secretKey);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function decodeEsewaBase64Payload(data: string): EsewaDecodedSuccessPayload | null {
  try {
    const json = Buffer.from(data, "base64").toString("utf8");
    const parsed = JSON.parse(json) as EsewaDecodedSuccessPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
