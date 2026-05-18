import { z } from "zod";

export const urgencySchema = z.enum(["Mild", "Moderate", "Urgent", "Emergency"]);

export const triageRequestSchema = z.object({
  symptoms: z.string().min(3).max(1500),
  issueDetails: z.string().min(3).max(2500),
  duration: z.string().min(1).max(120),
  severity: z.coerce.number().int().min(1).max(10),
  age: z.coerce.number().int().min(0).max(120),
  medicalHistory: z.string().max(1500).optional().default(""),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number()
    })
    .optional()
});

export const triageResponseSchema = z.object({
  possibleIssues: z.array(z.string()),
  urgency: urgencySchema,
  redFlags: z.array(z.string()),
  explanation: z.string(),
  suggestions: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
  recommendedSpecialist: z.string(),
  specialistReason: z.string(),
  needsMedicalAttention: z.boolean(),
  shouldCallEmergency: z.boolean(),
  searchQuery: z.string(),
  disclaimer: z.string()
});

export type TriageRequest = z.infer<typeof triageRequestSchema>;
export type TriageResponse = z.infer<typeof triageResponseSchema>;
