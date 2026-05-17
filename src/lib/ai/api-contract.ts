/** Response shape for POST `/api/ai/complete` and POST `/api/events/:id/ai/complete`. */
export type AiCompleteApiResponse = {
  text: string;
  templateId: string;
  templateVersion: string;
  model: string;
};
