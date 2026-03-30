import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/rbac";
import { toVendorOwnerSelfResponse, updateVendorProfile } from "@/services/vendor";
import { updateVendorProfileSchema, vendorIdParamSchema } from "@/lib/validations/vendor";
import { prisma } from "@/lib/db";
import { fromServiceError, parseJsonBody, validationError, apiError } from "@/lib/api/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const user = await requireVendor();
    const { vendorId } = await params;
    const parsed = vendorIdParamSchema.safeParse({ vendorId });
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const vendor = await prisma.vendor.findFirst({
      where: { id: parsed.data.vendorId, userId: user.id },
      include: { profile: true },
    });
    if (!vendor) {
      return apiError("Vendor not found", { status: 404, code: "VENDOR_NOT_FOUND" });
    }
    return NextResponse.json({ vendor: toVendorOwnerSelfResponse(vendor) });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to get vendor", code: "GET_VENDOR_FAILED" });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const user = await requireVendor();
    const { vendorId } = await params;
    const parsedId = vendorIdParamSchema.safeParse({ vendorId });
    if (!parsedId.success) {
      return validationError(parsedId.error.flatten());
    }
    const vendorIdResolved = parsedId.data.vendorId;
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const parsed = updateVendorProfileSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    await updateVendorProfile(vendorIdResolved, user.id, parsed.data);
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorIdResolved },
      include: { profile: true },
    });
    if (!vendor || vendor.userId !== user.id) {
      return apiError("Vendor not found", { status: 404, code: "VENDOR_NOT_FOUND" });
    }
    return NextResponse.json({ vendor: toVendorOwnerSelfResponse(vendor) });
  } catch (e) {
    return fromServiceError(e, { error: "Update failed", code: "UPDATE_VENDOR_FAILED" });
  }
}
