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
