import { z } from "zod";

const normalizedEmail = z.string().trim().toLowerCase().email();

export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

/**
 * Public customer registration (POST /api/auth/signup). Rejects extra keys (e.g. role).
 * Always creates CUSTOMER on the server.
 */
export const customerSignupSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required"),
    email: normalizedEmail,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

/** Seller onboarding account creation (POST /api/auth/signup/vendor). Same user role in DB (CUSTOMER until onboarding promotes). */
export const vendorIntentSignupSchema = z
  .object({
    email: normalizedEmail,
    password: passwordField,
  })
  .strict();

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, "Password is required"),
});

export const requestEmailVerificationSchema = z.object({
  email: normalizedEmail,
});

export const confirmEmailVerificationSchema = z.object({
  token: z.string().trim().min(1, "Verification token is required"),
});

export const passwordResetRequestSchema = z.object({
  email: normalizedEmail,
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required"),
  password: passwordField,
});

export type CustomerSignupInput = z.infer<typeof customerSignupSchema>;
export type VendorIntentSignupInput = z.infer<typeof vendorIntentSignupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestEmailVerificationInput = z.infer<typeof requestEmailVerificationSchema>;
export type ConfirmEmailVerificationInput = z.infer<typeof confirmEmailVerificationSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
