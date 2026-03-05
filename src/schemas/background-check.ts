import { z } from "zod/v4";

export const backgroundCheckSchema = z.object({
  instructionsRead: z.literal(true, { error: "You must confirm you have read the instructions" }),
  fingerprintingCompleted: z.literal(true, { error: "You must confirm fingerprinting is completed" }),
  appointmentDate: z.string().optional().or(z.literal("")),
});

export const backgroundCheckDraftSchema = backgroundCheckSchema.partial();

export type BackgroundCheckInput = z.infer<typeof backgroundCheckSchema>;
