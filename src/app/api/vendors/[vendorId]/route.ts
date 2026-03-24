import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/rbac";
import { updateVendorProfile } from "@/services/vendor";
import { updateVendorProfileSchema } from "@/lib/validations/vendor";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const user = await requireVendor();
    const { vendorId } = await params;
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, userId: user.id },
      include: { profile: true },
    });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    return NextResponse.json({ vendor });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to get vendor" }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const user = await requireVendor();
    const { vendorId } = await params;
    const body = await request.json();
    const parsed = updateVendorProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await updateVendorProfile(vendorId, user.id, parsed.data);
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { profile: true },
    });
    return NextResponse.json({ vendor });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Update failed" }, { status });
  }
}
