import { NextResponse } from "next/server";
import { isMockPaymentEnabled } from "@/config/env";

/** Public capability flags for checkout (no auth required; no secrets). */
export async function GET() {
  return NextResponse.json({
    mockPaymentEnabled: isMockPaymentEnabled(),
  });
}
