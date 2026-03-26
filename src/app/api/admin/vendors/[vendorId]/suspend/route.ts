import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { suspendVendor } from "@/services/vendor";
import { vendorIdParamSchema } from "@/lib/validations/vendor";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    await requireAdmin();
    const { vendorId } = await params;
    const parsed = vendorIdParamSchema.safeParse({ vendorId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const vendor = await suspendVendor(parsed.data.vendorId);
    return NextResponse.json({ vendor });
  } catch (e) {
    const err = e as Error & { statusCode?: number; code?: string };
    const status = err.statusCode ?? 500;
    return NextResponse.json(
      { error: err.message ?? "Suspend failed", code: err.code ?? "SUSPEND_VENDOR_FAILED" },
      { status }
    );
  }
}
