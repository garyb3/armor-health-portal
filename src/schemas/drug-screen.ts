import { z } from "zod/v4";

export const drugScreenSchema = z.object({
  donorFirstName: z.string().min(1, "First name is required"),
  donorLastName: z.string().min(1, "Last name is required"),
  donorMiddleName: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required"),
  email: z.email("Valid email is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "Valid ZIP code required (e.g. 43215)"),
  governmentIdType: z.enum(["drivers_license", "passport", "state_id", "military_id"]),
  governmentIdNumber: z.string().min(1, "ID number is required"),
  employerName: z.string().optional(),
  consentAcknowledged: z.boolean(),
});

export const drugScreenDraftSchema = drugScreenSchema.partial();

export type DrugScreenInput = z.infer<typeof drugScreenSchema>;
