import { z } from "zod";

export const createAddressSchema = z.object({
  label: z.string().trim().max(80).optional().or(z.literal("")),
  line1: z.string().trim().min(1, "Address line 1 is required"),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  country: z.string().trim().min(2, "Country is required").max(80),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
