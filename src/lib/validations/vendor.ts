import { z } from "zod";

const optionalPhone = z
  .string()
  .trim()
  .regex(/^\+?[0-9()\-\s]{7,20}$/, "Invalid contact phone format")
  .optional()
  .or(z.literal(""));

const nonEmptyString = z.string().trim().min(1, "Required");

const optionalNonEmpty = z.string().trim().optional().or(z.literal(""));

const businessTypeSchema = z.enum(["individual", "company"]);

const businessAddressSchema = z.object({
  province: nonEmptyString,
  city: nonEmptyString,
  fullAddress: nonEmptyString,
});

const bankDetailsSchema = z.object({
  bankName: nonEmptyString,
  accountNumber: nonEmptyString,
  accountHolder: nonEmptyString,
});

const storeProfileSchema = z.object({
  logoUrl: z.string().trim().url("Invalid logo URL").optional().or(z.literal("")),
  description: nonEmptyString,
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(64, "Slug must be at most 64 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

export const registerVendorSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  businessType: businessTypeSchema,
  panOrVatNumber: nonEmptyString,
  businessRegistrationNumber: optionalNonEmpty,
  businessAddress: businessAddressSchema,
  bankDetails: bankDetailsSchema,
  storeProfile: storeProfileSchema,
  categories: z.array(nonEmptyString).min(1, "At least one category is required"),
  termsAccepted: z.boolean().refine((v) => v === true, "You must accept the terms to continue"),
  documentUrl: z.string().url("Invalid document URL").optional().or(z.literal("")),
  contactEmail: z.string().trim().email("Invalid contact email").optional().or(z.literal("")),
  contactPhone: optionalPhone,
});

export const updateVendorProfileSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").optional(),
  documentUrl: z.string().url("Invalid document URL").optional().or(z.literal("")),
  contactEmail: z.string().trim().email("Invalid contact email").optional().or(z.literal("")),
  contactPhone: optionalPhone,
});

export const adminVendorActionSchema = z.object({
  action: z.enum(["approve", "suspend"]),
});

export const adminSuspendVendorSchema = z.object({
  rejectionReason: z.string().trim().max(1000, "Rejection reason is too long").optional(),
});

export const adminListVendorsQuerySchema = z.object({
  pending: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).optional(),
});

export const vendorIdParamSchema = z.object({
  vendorId: z.string().cuid("Invalid vendor id"),
});

export const productIdParamSchema = z.object({
  productId: z.string().cuid("Invalid product id"),
});

export type RegisterVendorInput = z.infer<typeof registerVendorSchema>;
export type UpdateVendorProfileInput = z.infer<typeof updateVendorProfileSchema>;
