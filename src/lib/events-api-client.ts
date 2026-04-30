import { apiFetchJson } from "@/lib/api/api-fetch-json";
import type { z } from "zod";
import { eventCreateSchema } from "@/lib/validation/event-mutation-schemas";
import type {
  Event,
  ChecklistItem,
  EventComment,
  EventDocument,
  EventMedia,
  ChecklistSection,
  DocumentTag,
  MediaTag,
  SwapMeetSpot,
  SwapMeetSpotSize,
} from "@/types/database";

export type CreateEventApiBody = z.infer<typeof eventCreateSchema>;

export async function apiCreateEvent(body: CreateEventApiBody): Promise<Event> {
  return apiFetchJson<Event>("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPatchEvent(
  eventId: string,
  body: Record<string, unknown>
): Promise<Event> {
  return apiFetchJson<Event>(`/api/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiDeleteEvent(eventId: string): Promise<void> {
  await apiFetchJson<{ ok: boolean }>(`/api/events/${eventId}`, {
    method: "DELETE",
  });
}

export async function apiAddChecklistItem(
  eventId: string,
  body: {
    section: ChecklistSection;
    label: string;
    sort_order: number;
    estimated_cost?: number | null;
  }
): Promise<ChecklistItem> {
  return apiFetchJson<ChecklistItem>(`/api/events/${eventId}/checklist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPatchChecklistItem(
  eventId: string,
  itemId: string,
  body: Record<string, unknown>
): Promise<ChecklistItem> {
  return apiFetchJson<ChecklistItem>(
    `/api/events/${eventId}/checklist/${itemId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function apiDeleteChecklistItem(
  eventId: string,
  itemId: string
): Promise<void> {
  await apiFetchJson<{ ok: boolean }>(
    `/api/events/${eventId}/checklist/${itemId}`,
    { method: "DELETE" }
  );
}

export async function apiAddComment(
  eventId: string,
  content: string
): Promise<EventComment> {
  return apiFetchJson<EventComment>(`/api/events/${eventId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export async function apiDeleteComment(
  eventId: string,
  commentId: string
): Promise<void> {
  await apiFetchJson<{ ok: boolean }>(
    `/api/events/${eventId}/comments/${commentId}`,
    { method: "DELETE" }
  );
}

export async function apiUploadDocument(
  eventId: string,
  file: File,
  tag: DocumentTag
): Promise<EventDocument> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("tag", tag);
  return apiFetchJson<EventDocument>(
    `/api/events/${eventId}/documents`,
    {
      method: "POST",
      body: fd,
    }
  );
}

export async function apiDeleteDocument(
  eventId: string,
  documentId: string
): Promise<void> {
  await apiFetchJson<{ ok: boolean }>(
    `/api/events/${eventId}/documents/${documentId}`,
    { method: "DELETE" }
  );
}

export async function apiUploadMedia(
  eventId: string,
  file: File,
  tag: MediaTag
): Promise<EventMedia> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("tag", tag);
  return apiFetchJson<EventMedia>(`/api/events/${eventId}/media`, {
    method: "POST",
    body: fd,
  });
}

export async function apiDeleteMedia(
  eventId: string,
  mediaId: string
): Promise<void> {
  await apiFetchJson<{ ok: boolean }>(
    `/api/events/${eventId}/media/${mediaId}`,
    { method: "DELETE" }
  );
}

// Swap Meet Spots

export async function apiFetchSwapMeetSpots(
  eventId: string
): Promise<SwapMeetSpot[]> {
  const res = await apiFetchJson<{ spots: SwapMeetSpot[] }>(
    `/api/events/${eventId}/swap-meet`
  );
  return res.spots;
}

export async function apiAddSwapMeetSpot(
  eventId: string,
  body: { name: string; phone?: string; email?: string; spot_size: SwapMeetSpotSize }
): Promise<SwapMeetSpot> {
  return apiFetchJson<SwapMeetSpot>(`/api/events/${eventId}/swap-meet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPatchSwapMeetSpot(
  eventId: string,
  spotId: string,
  body: Record<string, unknown>
): Promise<SwapMeetSpot> {
  return apiFetchJson<SwapMeetSpot>(
    `/api/events/${eventId}/swap-meet/${spotId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function apiUploadSwapMeetWaiver(
  eventId: string,
  spotId: string,
  file: File
): Promise<SwapMeetSpot> {
  const fd = new FormData();
  fd.append("waiver", file);
  return apiFetchJson<SwapMeetSpot>(
    `/api/events/${eventId}/swap-meet/${spotId}`,
    { method: "PATCH", body: fd }
  );
}

export async function apiDeleteSwapMeetSpot(
  eventId: string,
  spotId: string
): Promise<void> {
  await apiFetchJson<{ ok: boolean }>(
    `/api/events/${eventId}/swap-meet/${spotId}`,
    { method: "DELETE" }
  );
}
