import { z } from "zod/v4";

export const ROLE_OPTIONS = [
  { value: "HR", label: "HR" },
  { value: "ADMIN", label: "Admin" },
] as const;

export const STAFF_ROLES = ["HR", "ADMIN"] as const;

export const registerSchema = z
  .object({
    email: z.email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((p) => /[A-Z]/.test(p), "Password must include an uppercase letter")
      .refine((p) => /[a-z]/.test(p), "Password must include a lowercase letter")
      .refine((p) => /[0-9]/.test(p), "Password must include a number")
      .refine((p) => /[^A-Za-z0-9]/.test(p), "Password must include a special character"),
    confirmPassword: z.string(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    role: z.enum(["HR", "ADMIN"], {
      message: "Please select a role",
    }),
    phone: z.string().optional(),
    inviteToken: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createInviteSchema = z.object({
  email: z.email("Please enter a valid email address"),
  role: z.enum(STAFF_ROLES, { message: "Please select a staff role" }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
