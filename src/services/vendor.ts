import { prisma } from "@/lib/db";
import type { RegisterVendorInput, UpdateVendorProfileInput } from "@/lib/validations/vendor";
import { Prisma, UserRole, VendorStatus } from "@prisma/client";

type VendorWithProfile = Prisma.VendorGetPayload<{ include: { profile: true } }>;

type ServiceError = Error & { statusCode?: number; code?: string };

function createServiceError(
  message: string,
  statusCode: number,
  code: string
): ServiceError {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function normalizeOptional(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toNonAdminVendorResponse(vendor: VendorWithProfile) {
  return {
    id: vendor.id,
    userId: vendor.userId,
    status: vendor.status,
    approvedAt: vendor.approvedAt,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
    profile: vendor.profile
      ? {
          id: vendor.profile.id,
          vendorId: vendor.profile.vendorId,
          businessName: vendor.profile.businessName,
          createdAt: vendor.profile.createdAt,
          updatedAt: vendor.profile.updatedAt,
        }
      : null,
  };
}

/** Vendor snippet for public catalog (no PII or moderation fields). */
export function toPublicProductVendor(vendor: { id: string; profile: { businessName: string } | null }) {
  return {
    id: vendor.id,
    profile: vendor.profile ? { businessName: vendor.profile.businessName } : null,
  };
}

export async function getVendorByUserId(userId: string) {
  return prisma.vendor.findUnique({
    where: { userId },
    include: { profile: true },
  });
}

export async function submitVendorOnboarding(userId: string, input: RegisterVendorInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, emailVerified: true },
  });

  if (!user) {
    throw createServiceError("Unauthorized", 401, "UNAUTHORIZED");
  }
  if (!user.emailVerified) {
    throw createServiceError(
      "Email must be verified before vendor onboarding submission",
      403,
      "EMAIL_NOT_VERIFIED"
    );
  }
  if (user.role === UserRole.ADMIN) {
    throw createServiceError("Admin users cannot submit vendor onboarding", 403, "ROLE_NOT_ALLOWED");
  }

  try {
    const vendor = await prisma.$transaction(async (tx) => {
      const existingVendor = await tx.vendor.findUnique({
        where: { userId },
        include: { profile: true },
      });

      const profileData = {
        businessName: input.businessName.trim(),
        documentUrl: normalizeOptional(input.documentUrl),
        contactEmail: normalizeOptional(input.contactEmail),
        contactPhone: normalizeOptional(input.contactPhone),
      };

      if (!existingVendor) {
        if (user.role === UserRole.CUSTOMER) {
          await tx.user.update({
            where: { id: userId },
            data: { role: UserRole.VENDOR },
          });
        }

        return tx.vendor.create({
          data: {
            userId,
            status: VendorStatus.PENDING,
            approvedAt: null,
            approvedById: null,
            profile: {
              create: profileData,
            },
          },
          include: { profile: true },
        });
      }

      if (existingVendor.status !== VendorStatus.PENDING) {
        throw createServiceError(
          "Onboarding can only be submitted or updated while vendor status is PENDING",
          409,
          "INVALID_VENDOR_STATE"
        );
      }

      const updatedVendor = await tx.vendor.update({
        where: { id: existingVendor.id },
        data: {
          approvedAt: null,
          approvedById: null,
          profile: existingVendor.profile
            ? {
                update: profileData,
              }
            : {
                create: profileData,
              },
        },
        include: { profile: true },
      });

      return updatedVendor;
    });

    return vendor;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw createServiceError("Vendor onboarding already exists for this user", 409, "VENDOR_EXISTS");
    }
    throw e;
  }
}

export async function updateVendorProfile(vendorId: string, userId: string, input: UpdateVendorProfileInput) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, userId },
    include: { profile: true },
  });
  if (!vendor) {
    throw createServiceError("Vendor not found", 404, "VENDOR_NOT_FOUND");
  }
  if (vendor.status === VendorStatus.SUSPENDED) {
    throw createServiceError("Vendor is suspended", 403, "VENDOR_SUSPENDED");
  }
  if (!vendor.profile) {
    throw createServiceError("Vendor profile not found", 404, "VENDOR_PROFILE_NOT_FOUND");
  }
  return prisma.vendorProfile.update({
    where: { id: vendor.profile.id },
    data: {
      ...(input.businessName != null && { businessName: input.businessName }),
      ...(input.documentUrl !== undefined && { documentUrl: normalizeOptional(input.documentUrl) }),
      ...(input.contactEmail !== undefined && { contactEmail: normalizeOptional(input.contactEmail) }),
      ...(input.contactPhone !== undefined && { contactPhone: normalizeOptional(input.contactPhone) }),
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
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { profile: true, user: { select: { id: true, email: true, role: true } } },
  });
  if (!vendor) {
    throw createServiceError("Vendor not found", 404, "VENDOR_NOT_FOUND");
  }

  // Idempotency: approving an already-approved vendor is a safe no-op.
  if (vendor.status === VendorStatus.APPROVED) {
    return vendor;
  }

  // Business rules: allow approval from PENDING (and reinstatement from SUSPENDED).
  if (vendor.status !== VendorStatus.PENDING && vendor.status !== VendorStatus.SUSPENDED) {
    throw createServiceError("Vendor cannot be approved from current status", 409, "INVALID_VENDOR_STATE");
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Ensure the owning user ends up with VENDOR role (no escalation beyond that).
    if (vendor.user.role !== UserRole.VENDOR) {
      await tx.user.update({
        where: { id: vendor.userId },
        data: { role: UserRole.VENDOR },
      });
    }

    return tx.vendor.update({
      where: { id: vendorId },
      data: {
        status: VendorStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: adminUserId,
      },
      include: { profile: true, user: { select: { id: true, email: true, role: true } } },
    });
  });

  return updated;
}

export async function suspendVendor(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { profile: true, user: { select: { id: true, email: true } } },
  });
  if (!vendor) {
    throw createServiceError("Vendor not found", 404, "VENDOR_NOT_FOUND");
  }

  // Idempotency: suspending an already-suspended vendor is a safe no-op.
  if (vendor.status === VendorStatus.SUSPENDED) {
    return vendor;
  }

  // Business rules: allow suspension from PENDING or APPROVED.
  if (vendor.status !== VendorStatus.PENDING && vendor.status !== VendorStatus.APPROVED) {
    throw createServiceError("Vendor cannot be suspended from current status", 409, "INVALID_VENDOR_STATE");
  }

  return prisma.vendor.update({
    where: { id: vendorId },
    data: { status: VendorStatus.SUSPENDED },
    include: { profile: true, user: { select: { id: true, email: true } } },
  });
}

export async function listVendorsForAdmin(status?: VendorStatus) {
  return prisma.vendor.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, email: true } }, profile: true },
    orderBy: { createdAt: "desc" },
  });
}
