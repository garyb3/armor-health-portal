import { z } from "zod/v4";

export const volunteerApplicationSchema = z.object({
  // Personal Information
  lastName: z.string().min(1, "Last name is required"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional().or(z.literal("")),
  maidenName: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  cityOfBirth: z.string().min(1, "City of birth is required"),
  stateOfBirth: z.string().min(1, "State of birth is required"),
  // SSN — validated client-side only, NEVER stored in DB
  ssn: z
    .string()
    .regex(/^\d{3}-?\d{2}-?\d{4}$/, "Valid SSN required (XXX-XX-XXXX)"),
  phone: z.string().min(1, "Phone number is required"),
  residentAlienNumber: z.string().optional().or(z.literal("")),

  // Physical Description
  height: z.string().min(1, "Height is required"),
  weight: z.string().min(1, "Weight is required"),
  hairColor: z.string().min(1, "Hair color is required"),
  eyeColor: z.string().min(1, "Eye color is required"),
  race: z.string().min(1, "Race is required"),
  sex: z.enum(["Male", "Female"]),

  // Primary Address
  primaryStreet: z.string().min(1, "Street address is required"),
  primaryCity: z.string().min(1, "City is required"),
  primaryState: z.string().min(1, "State is required"),
  primaryZip: z.string().min(1, "ZIP code is required"),

  // Current Address (if different)
  currentAddressDifferent: z.boolean().optional(),
  currentStreet: z.string().optional().or(z.literal("")),
  currentCity: z.string().optional().or(z.literal("")),
  currentState: z.string().optional().or(z.literal("")),
  currentZip: z.string().optional().or(z.literal("")),

  // Professional License
  professionalLicenseType: z.string().optional().or(z.literal("")),
  professionalLicenseNumber: z.string().optional().or(z.literal("")),
  professionalLicenseState: z.string().optional().or(z.literal("")),

  // Incarcerated Acquaintances
  hasIncarceratedAcquaintances: z.enum(["yes", "no"]),
  incarceratedAcquaintancesDetails: z.string().optional().or(z.literal("")),

  // Certification
  certificationFile: z.string().optional().or(z.literal("")),

  // Signature
  signature: z.string().optional().or(z.literal("")),
  signatureDate: z.string().min(1, "Signature date is required"),
  electronicSignatureConsent: z.boolean(),
});

export const volunteerApplicationDraftSchema =
  volunteerApplicationSchema.partial();

export type VolunteerApplicationInput = z.infer<
  typeof volunteerApplicationSchema
>;
