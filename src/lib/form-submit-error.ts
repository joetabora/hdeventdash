import { isApiError } from "@/lib/api/api-fetch-json";

/** User-facing message for failed form submissions (API routes, thrown Errors). */
export function formSubmitErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
