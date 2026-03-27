import { apiFetchJson } from "@/lib/api/api-fetch-json";
import type {
  Event,
  ChecklistItem,
  EventComment,
  EventDocument,
  EventMedia,
  EventStatus,
  EventType,
  ChecklistSection,
  DocumentTag,
  MediaTag,
} from "@/types/database";

export type CreateEventApiBody = {
  name: string;
  date: string;
  location: string;
  owner: string;
  status: EventStatus;
  description: string;
  onedrive_link?: string;
  event_type?: EventType | null;
  planned_budget?: number | null;
  actual_budget?: number | null;
};

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
