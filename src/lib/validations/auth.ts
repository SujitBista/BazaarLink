import { z } from "zod";

const normalizedEmail = z.string().trim().toLowerCase().email();

export const signupSchema = z.object({
  email: normalizedEmail,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/[0-9]/, "Password must include a number"),
});

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
  password: signupSchema.shape.password,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestEmailVerificationInput = z.infer<typeof requestEmailVerificationSchema>;
export type ConfirmEmailVerificationInput = z.infer<typeof confirmEmailVerificationSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
