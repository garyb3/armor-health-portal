import { z } from "zod/v4";

export const backgroundCheckSchema = z.object({
  instructionsRead: z.boolean(),
  fingerprintingCompleted: z.boolean(),
  appointmentDate: z.string().optional().or(z.literal("")),
});

export const backgroundCheckDraftSchema = backgroundCheckSchema.partial();

export type BackgroundCheckInput = z.infer<typeof backgroundCheckSchema>;
