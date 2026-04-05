const required = ["DATABASE_URL", "SESSION_SECRET"] as const;

export function assertEnv() {
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env: ${key}`);
    }
  }
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return secret;
}

/** Platform commission percentage (0–100) applied at payment capture. */
export function getDefaultCommissionPercent(): number {
  const raw = process.env.DEFAULT_COMMISSION_PERCENT;
  if (raw == null || raw === "") return 10;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return 10;
  return n;
}

/** Flat shipping for checkout (currency units matching product prices). */
export function getDefaultShippingAmount(): number {
  const raw = process.env.DEFAULT_SHIPPING_AMOUNT;
  if (raw == null || raw === "") return 5;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

/** Public site URL for eSewa return URLs (no trailing slash). */
export function getPublicAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}

/**
 * Simulated payment capture via POST /api/orders/:id/pay.
 * Enabled when ENABLE_MOCK_PAYMENT is "true", or in development by default so eSewa UAT
 * outages (e.g. reCAPTCHA quota on their login page) do not block local checkout.
 * Set ENABLE_MOCK_PAYMENT=false to force the real eSewa redirect in dev.
 */
export function isMockPaymentEnabled(): boolean {
  const explicit = process.env.ENABLE_MOCK_PAYMENT?.trim().toLowerCase();
  if (explicit === "false" || explicit === "0") return false;
  if (explicit === "true" || explicit === "1") return true;
  return process.env.NODE_ENV === "development";
}

export function getEsewaProductCode(): string {
  const v = process.env.ESEWA_PRODUCT_CODE?.trim();
  if (!v) {
    throw new Error("ESEWA_PRODUCT_CODE is not configured");
  }
  return v;
}

export function getEsewaSecretKey(): string {
  const v = process.env.ESEWA_SECRET_KEY?.trim();
  if (!v) {
    throw new Error("ESEWA_SECRET_KEY is not configured");
  }
  return v;
}

/** eSewa payment form POST target (UAT or production). */
export function getEsewaFormUrl(): string {
  const v = process.env.ESEWA_FORM_URL?.trim();
  if (v) return v;
  return "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
}

/** Status enquiry API base (no query string). */
export function getEsewaStatusUrl(): string {
  const v = process.env.ESEWA_STATUS_URL?.trim();
  if (v) return v;
  return "https://uat.esewa.com.np/api/epay/transaction/status/";
}
