import { z } from "zod";

const aiVariablesSchema = z
  .record(z.string(), z.unknown())
  .refine((rec) => Object.keys(rec).length <= 48, {
    message: "Too many variable keys.",
  });

export const aiCompleteRequestSchema = z
  .object({
    templateId: z.string().trim().min(1).max(160),
    variables: aiVariablesSchema.optional().default({}),
    model: z.string().trim().max(128).optional(),
  })
  .strict();

export type AiCompleteRequestBody = z.infer<typeof aiCompleteRequestSchema>;
