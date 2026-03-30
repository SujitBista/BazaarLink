import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { apiError } from "@/lib/api/errors";
import { checkStoreSlugAvailability } from "@/services/vendor";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";

    const result = await checkStoreSlugAvailability(slug, user.id);
    return NextResponse.json(result);
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.message === "Unauthorized") {
      return apiError("Unauthorized", { status: 401, code: "UNAUTHORIZED" });
    }
    return apiError(err.message ?? "Failed to check slug", { status: 500, code: "CHECK_SLUG_FAILED" });
  }
}
