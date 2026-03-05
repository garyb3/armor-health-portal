import { z } from "zod/v4";

export const webCheckSchema = z.object({
  lastName: z.string().min(1, "Last name is required"),
  firstName: z.string().min(1, "First name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  // SSN — validated client-side only, NEVER stored in DB
  ssn: z
    .string()
    .regex(/^\d{3}-?\d{2}-?\d{4}$/, "Valid SSN required (XXX-XX-XXXX)"),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  phone: z.string().min(1, "Phone number is required"),
  acknowledgmentInitials: z.string().min(1, "Initials are required"),
  signature: z.string().optional().or(z.literal("")),
  signatureDate: z.string().min(1, "Signature date is required"),
  consentAcknowledged: z.literal(true, { error: "You must acknowledge and consent to proceed" }),
});

export const webCheckDraftSchema = webCheckSchema.partial();

export type WebCheckInput = z.infer<typeof webCheckSchema>;
