import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { fromServiceError } from "@/lib/api/errors";

/** Placeholder for coupon/promotion management (Phase 6 extension point). */
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      promotions: [] as unknown[],
      message: "Promotion engine not enabled yet. Use env-based pricing or extend this route.",
    });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to list promotions", code: "LIST_PROMOTIONS_FAILED" });
  }
}
