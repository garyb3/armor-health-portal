import { z } from "zod/v4";

export const ROLE_OPTIONS = [
  { value: "HR", label: "HR" },
  { value: "ADMIN", label: "Admin" },
] as const;

export const STAFF_ROLES = ["HR", "ADMIN"] as const;

// NIST 800-63B–aligned policy: length over composition rules.
// Minimum 12 chars, maximum 128 (bcrypt truncates at 72 but we allow more input so the
// user's memorable phrase isn't silently cropped at the boundary), and a small hard-blocklist
// of obvious-choice passwords so nobody ships "Password1234".
const COMMON_PASSWORDS = new Set([
  "password1234",
  "passwordpassword",
  "armorhealth123",
  "qwerty123456",
  "123456789012",
  "aaaaaaaaaaaa",
  "letmeinletmein",
]);
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), "Password is too common");

export const registerSchema = z
  .object({
    email: z.email("Please enter a valid email address"),
    password: passwordSchema,
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
