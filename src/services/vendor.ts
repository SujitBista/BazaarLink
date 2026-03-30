import { prisma } from "@/lib/db";
import type { RegisterVendorInput, UpdateVendorProfileInput } from "@/lib/validations/vendor";
import { BusinessType, Prisma, UserRole, VendorStatus } from "@prisma/client";
import { notifyAdminVendorApplicationSubmitted } from "@/lib/admin-notify";

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
    termsAccepted: vendor.termsAccepted,
    rejectionReason: vendor.rejectionReason,
    approvedAt: vendor.approvedAt,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
    profile: vendor.profile
      ? {
          id: vendor.profile.id,
          vendorId: vendor.profile.vendorId,
          businessName: vendor.profile.businessName,
          businessType: vendor.profile.businessType,
          panOrVatNumber: vendor.profile.panOrVatNumber,
          businessRegistrationNumber: vendor.profile.businessRegistrationNumber,
          businessAddress: {
            province: vendor.profile.businessAddressProvince,
            city: vendor.profile.businessAddressCity,
            fullAddress: vendor.profile.businessAddressFull,
          },
          bankDetails: {
            bankName: vendor.profile.bankName,
            accountNumber: vendor.profile.bankAccountNumber,
            accountHolder: vendor.profile.bankAccountHolder,
          },
          storeProfile: {
            logoUrl: vendor.profile.storeLogoUrl,
            description: vendor.profile.storeDescription,
            slug: vendor.profile.storeSlug,
          },
          categories: vendor.profile.categories,
          createdAt: vendor.profile.createdAt,
          updatedAt: vendor.profile.updatedAt,
        }
      : null,
  };
}

/** Vendor owner self-service (onboarding / GET /api/vendors/me): includes contact fields and KYC doc URL for the owner. */
export function toVendorOwnerSelfResponse(vendor: VendorWithProfile) {
  const base = toNonAdminVendorResponse(vendor);
  if (!vendor.profile || !base.profile) return base;
  return {
    ...base,
    profile: {
      ...base.profile,
      contactEmail: vendor.profile.contactEmail,
      contactPhone: vendor.profile.contactPhone,
      documentUrl: vendor.profile.documentUrl,
    },
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

/** Public API + onboarding: slug availability for the signed-in user (excludes their own vendor). */
export async function checkStoreSlugAvailability(slug: string, userId: string) {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length < 3) {
    return { available: false as const, normalized, reason: "SHORT" as const };
  }
  if (normalized.length > 64) {
    return { available: false as const, normalized, reason: "LONG" as const };
  }
  if (!/^[a-z0-9-]+$/.test(normalized)) {
    return { available: false as const, normalized, reason: "INVALID" as const };
  }

  const myVendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  });

  const conflict = await prisma.vendorProfile.findFirst({
    where: {
      storeSlug: normalized,
      ...(myVendor ? { vendorId: { not: myVendor.id } } : {}),
    },
    select: { id: true },
  });

  return { available: !conflict, normalized };
}

export async function submitVendorOnboarding(userId: string, input: RegisterVendorInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, emailVerified: true },
  });

  if (!user) {
    throw createServiceError("Unauthorized", 401, "UNAUTHORIZED");
  }
  if (user.role === UserRole.ADMIN) {
    throw createServiceError("Admin users cannot submit vendor onboarding", 403, "ROLE_NOT_ALLOWED");
  }
  if (!user.emailVerified) {
    throw createServiceError("Email not verified", 403, "EMAIL_NOT_VERIFIED");
  }

  const slugNormalized = input.storeProfile.slug.trim().toLowerCase();
  const myVendorForSlug = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  });
  const slugTaken = await prisma.vendorProfile.findFirst({
    where: {
      storeSlug: slugNormalized,
      ...(myVendorForSlug ? { vendorId: { not: myVendorForSlug.id } } : {}),
    },
    select: { id: true },
  });
  if (slugTaken) {
    throw createServiceError("Store slug is already taken", 409, "STORE_SLUG_TAKEN");
  }

  try {
    let isFirstApplication = false;
    const vendor = await prisma.$transaction(async (tx) => {
      const existingVendor = await tx.vendor.findUnique({
        where: { userId },
        include: { profile: true },
      });

      const profileData = {
        businessName: input.businessName.trim(),
        businessType: input.businessType === "individual" ? BusinessType.INDIVIDUAL : BusinessType.COMPANY,
        panOrVatNumber: input.panOrVatNumber.trim(),
        businessRegistrationNumber: normalizeOptional(input.businessRegistrationNumber),
        businessAddressProvince: input.businessAddress.province.trim(),
        businessAddressCity: input.businessAddress.city.trim(),
        businessAddressFull: input.businessAddress.fullAddress.trim(),
        bankName: input.bankDetails.bankName.trim(),
        bankAccountNumber: input.bankDetails.accountNumber.trim(),
        bankAccountHolder: input.bankDetails.accountHolder.trim(),
        storeLogoUrl: normalizeOptional(input.storeProfile.logoUrl),
        storeDescription: input.storeProfile.description.trim(),
        storeSlug: slugNormalized,
        categories: input.categories.map((category) => category.trim()).filter(Boolean),
        documentUrl: normalizeOptional(input.documentUrl),
        contactEmail: normalizeOptional(input.contactEmail),
        contactPhone: normalizeOptional(input.contactPhone),
      };

      if (!existingVendor) {
        isFirstApplication = true;
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
            termsAccepted: input.termsAccepted,
            rejectionReason: null,
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
          termsAccepted: input.termsAccepted,
          rejectionReason: null,
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

    if (isFirstApplication) {
      notifyAdminVendorApplicationSubmitted({
        vendorId: vendor.id,
        accountEmail: user.email,
        businessName: input.businessName.trim(),
      });
    }

    return vendor;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta as { target?: string[] })?.target;
      if (Array.isArray(target) && target.includes("store_slug")) {
        throw createServiceError("Store slug is already taken", 409, "STORE_SLUG_TAKEN");
      }
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
        rejectionReason: null,
        approvedAt: new Date(),
        approvedById: adminUserId,
      },
      include: { profile: true, user: { select: { id: true, email: true, role: true } } },
    });
  });

  return updated;
}

export async function suspendVendor(vendorId: string, rejectionReason?: string) {
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
    data: {
      status: VendorStatus.SUSPENDED,
      rejectionReason: normalizeOptional(rejectionReason),
    },
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
