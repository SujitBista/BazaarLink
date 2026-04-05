import { describe, expect, it } from "vitest";
import {
  buildEsewaRequestSigningMessage,
  generateEsewaTransactionUuid,
  signEsewaMessage,
} from "./esewa";

describe("eSewa ePay v2 signing", () => {
  it("matches PHP hash_hmac (UAT secret + doc message shape)", () => {
    const msg = buildEsewaRequestSigningMessage("100", "11-201-13", "EPAYTEST");
    expect(msg).toBe("total_amount=100,transaction_uuid=11-201-13,product_code=EPAYTEST");
    const sig = signEsewaMessage(msg, "8gBm/:&EnhH.1/q");
    expect(sig).toBe("5DZywcrTKD0gia/rsSMcrRHmJl+4Tbol6S+lWgdJ94E=");
  });

  it("generates 32-char hex transaction ids", () => {
    const a = generateEsewaTransactionUuid();
    const b = generateEsewaTransactionUuid();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(b).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });
});
