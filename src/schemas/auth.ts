import { z } from "zod/v4";

export const ROLE_OPTIONS = [
  { value: "APPLICANT", label: "Applicant" },
  { value: "RECRUITER", label: "Recruiter" },
  { value: "ADMIN_ASSISTANT", label: "Admin Assistant" },
  { value: "COUNTY_REPRESENTATIVE", label: "County Representative" },
  { value: "HR", label: "HR" },
] as const;

export const STAFF_ROLES = ["RECRUITER", "ADMIN_ASSISTANT", "COUNTY_REPRESENTATIVE", "HR"] as const;

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
    role: z.enum(["APPLICANT", "RECRUITER", "ADMIN_ASSISTANT", "COUNTY_REPRESENTATIVE", "HR"], {
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
