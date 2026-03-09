import { z } from "zod/v4";

export const volunteerAppSchema = z.object({
  confirmationSent: z.literal(true, {
    error: "You must confirm you have sent the application to Franklin County",
  }),
});

export const volunteerAppDraftSchema = volunteerAppSchema.partial();

export type VolunteerAppInput = z.infer<typeof volunteerAppSchema>;
