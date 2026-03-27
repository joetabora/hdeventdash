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

function errorFromBody(data: unknown, status: number): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return `Request failed (${status})`;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorFromBody(data, res.status));
  return data as T;
}

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
  return jsonFetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPatchEvent(
  eventId: string,
  body: Record<string, unknown>
): Promise<Event> {
  return jsonFetch(`/api/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiDeleteEvent(eventId: string): Promise<void> {
  await jsonFetch<{ ok: boolean }>(`/api/events/${eventId}`, {
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
  return jsonFetch(`/api/events/${eventId}/checklist`, {
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
  return jsonFetch(`/api/events/${eventId}/checklist/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiDeleteChecklistItem(
  eventId: string,
  itemId: string
): Promise<void> {
  await jsonFetch<{ ok: boolean }>(
    `/api/events/${eventId}/checklist/${itemId}`,
    { method: "DELETE" }
  );
}

export async function apiAddComment(
  eventId: string,
  content: string
): Promise<EventComment> {
  return jsonFetch(`/api/events/${eventId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export async function apiDeleteComment(
  eventId: string,
  commentId: string
): Promise<void> {
  await jsonFetch<{ ok: boolean }>(
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
  const res = await fetch(`/api/events/${eventId}/documents`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorFromBody(data, res.status));
  return data as EventDocument;
}

export async function apiDeleteDocument(
  eventId: string,
  documentId: string
): Promise<void> {
  await jsonFetch<{ ok: boolean }>(
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
  const res = await fetch(`/api/events/${eventId}/media`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorFromBody(data, res.status));
  return data as EventMedia;
}

export async function apiDeleteMedia(
  eventId: string,
  mediaId: string
): Promise<void> {
  await jsonFetch<{ ok: boolean }>(
    `/api/events/${eventId}/media/${mediaId}`,
    { method: "DELETE" }
  );
}
