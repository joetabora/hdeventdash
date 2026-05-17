import { z } from "zod";

export const rawSocialPostSchema = z.object({
  platform: z.string().min(1),
  angle: z.string().min(1),
  content: z.string().min(1),
});

export const rawSocialPostsPackSchema = z.array(rawSocialPostSchema).length(8);

export const rawEmailCampaignSchema = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const rawEmailPackSchema = z.array(rawEmailCampaignSchema).length(4);

export const rawDescriptionSchema = z.object({
  label: z.string().min(1),
  content: z.string().min(1),
});

export const rawDescriptionsPackSchema = z.array(rawDescriptionSchema).length(4);

export const rawSocialPostSingleSchema = rawSocialPostSchema;

export const rawEmailSingleSchema = rawEmailCampaignSchema;

export const rawDescriptionSingleSchema = rawDescriptionSchema;

export const rawHashtagsResponseSchema = z.object({
  hashtags: z.array(z.string().min(1)).min(4).max(45),
});
