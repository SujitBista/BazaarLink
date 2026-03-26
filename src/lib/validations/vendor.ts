import { z } from "zod";

const optionalPhone = z
  .string()
  .trim()
  .regex(/^\+?[0-9()\-\s]{7,20}$/, "Invalid contact phone format")
  .optional()
  .or(z.literal(""));

export const registerVendorSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
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

export const adminListVendorsQuerySchema = z.object({
  pending: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).optional(),
});

export const vendorIdParamSchema = z.object({
  vendorId: z.string().trim().min(1, "vendorId is required"),
});

export type RegisterVendorInput = z.infer<typeof registerVendorSchema>;
export type UpdateVendorProfileInput = z.infer<typeof updateVendorProfileSchema>;
