import { z } from "zod/v4";

export const drugScreenSchema = z.object({
  employerName: z.string().optional(),
  consentAcknowledged: z.literal(true, { error: "You must acknowledge consent to proceed" }),
});

export const drugScreenDraftSchema = drugScreenSchema.partial();

export type DrugScreenInput = z.infer<typeof drugScreenSchema>;
