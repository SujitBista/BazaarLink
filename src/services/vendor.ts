import { prisma } from "@/lib/db";
import type { RegisterVendorInput, UpdateVendorProfileInput } from "@/lib/validations/vendor";
import { VendorStatus } from "@prisma/client";

export async function getVendorByUserId(userId: string) {
  return prisma.vendor.findUnique({
    where: { userId },
    include: { profile: true },
  });
}

export async function registerVendor(userId: string, input: RegisterVendorInput) {
  const existing = await prisma.vendor.findUnique({ where: { userId } });
  if (existing) {
    const err = new Error("User is already registered as a vendor");
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }
  return prisma.vendor.create({
    data: {
      userId,
      status: VendorStatus.PENDING,
      profile: {
        create: {
          businessName: input.businessName,
          documentUrl: input.documentUrl || null,
          contactEmail: input.contactEmail || null,
          contactPhone: input.contactPhone || null,
        },
      },
    },
    include: { profile: true },
  });
}

export async function updateVendorProfile(vendorId: string, userId: string, input: UpdateVendorProfileInput) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, userId },
    include: { profile: true },
  });
  if (!vendor) {
    const err = new Error("Vendor not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  if (vendor.status === VendorStatus.SUSPENDED) {
    const err = new Error("Vendor is suspended");
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
  if (!vendor.profile) {
    const err = new Error("Vendor profile not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  return prisma.vendorProfile.update({
    where: { id: vendor.profile.id },
    data: {
      ...(input.businessName != null && { businessName: input.businessName }),
      ...(input.documentUrl !== undefined && { documentUrl: input.documentUrl || null }),
      ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail || null }),
      ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone || null }),
    },
  });
}

export async function listPendingVendors() {
  return prisma.vendor.findMany({
    where: { status: VendorStatus.PENDING },
    include: { user: { select: { id: true, email: true } }, profile: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function approveVendor(vendorId: string, adminUserId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    const err = new Error("Vendor not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  if (vendor.status !== VendorStatus.PENDING) {
    const err = new Error("Vendor is not pending approval");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  return prisma.vendor.update({
    where: { id: vendorId },
    data: {
      status: VendorStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy: adminUserId,
    },
    include: { profile: true, user: { select: { email: true } } },
  });
}

export async function suspendVendor(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    const err = new Error("Vendor not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  return prisma.vendor.update({
    where: { id: vendorId },
    data: { status: VendorStatus.SUSPENDED },
    include: { profile: true },
  });
}

export async function listVendorsForAdmin(status?: VendorStatus) {
  return prisma.vendor.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, email: true } }, profile: true },
    orderBy: { createdAt: "desc" },
  });
}
