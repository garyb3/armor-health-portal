import { z } from "zod/v4";

export const professionalLicenseSchema = z.object({
  licenseSent: z.literal(true, {
    error: "You must confirm you have sent a copy of your license",
  }),
});

export const professionalLicenseDraftSchema =
  professionalLicenseSchema.partial();

export type ProfessionalLicenseInput = z.infer<
  typeof professionalLicenseSchema
>;
