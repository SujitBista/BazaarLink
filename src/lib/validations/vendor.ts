import { z } from "zod";

export const registerVendorSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  documentUrl: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

export const updateVendorProfileSchema = z.object({
  businessName: z.string().min(1).optional(),
  documentUrl: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

export const adminVendorActionSchema = z.object({
  action: z.enum(["approve", "suspend"]),
});

export type RegisterVendorInput = z.infer<typeof registerVendorSchema>;
export type UpdateVendorProfileInput = z.infer<typeof updateVendorProfileSchema>;
