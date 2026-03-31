import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { rejectVendor } from "@/services/vendor";
import { adminModerationNoteBodySchema, vendorIdParamSchema } from "@/lib/validations/vendor";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function POST(request: Request, { params }: { params: Promise<{ vendorId: string }> }) {
  try {
    const user = await requireAdmin();
    const { vendorId } = await params;
    const parsed = vendorIdParamSchema.safeParse({ vendorId });
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const payload = adminModerationNoteBodySchema.safeParse(parsedBody.body ?? {});
    if (!payload.success) {
      return validationError(payload.error.flatten());
    }

    const vendor = await rejectVendor(parsed.data.vendorId, user.id, payload.data.note);
    return NextResponse.json({ vendor });
  } catch (e) {
    return fromServiceError(e, { error: "Reject failed", code: "REJECT_VENDOR_FAILED" });
  }
}
