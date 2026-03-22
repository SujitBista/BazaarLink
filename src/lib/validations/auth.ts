import { z } from "zod";
import { UserRole } from "@/types/enums";

const roleEnum = z.enum(["CUSTOMER", "VENDOR", "ADMIN"]);

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleEnum.default("CUSTOMER"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
