import { SupabaseClient } from "@supabase/supabase-js";
import {
  Event,
  EventStatus,
  EventType,
  ChecklistItem,
  EventDocument,
  EventComment,
  EventMedia,
  ChecklistSection,
  DocumentTag,
  MediaTag,
} from "@/types/database";
import { getCurrentOrganizationId } from "@/lib/organization";
import {
  firstDayOfNextCalendarMonth,
  type EventBudgetPeer,
} from "@/lib/budgets";
import { validateEventUploadFile } from "@/lib/validation/upload-file";

export const EVENT_DOCUMENTS_BUCKET = "event-documents" as const;

/** Signed URL lifetime for event storage objects (authenticated users only). */
export const EVENT_DOCUMENTS_SIGNED_URL_TTL_SECONDS = 3600;

export async function getEvents(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return data as Event[];
}

/** ~18 months in the past through ~24 months ahead; excludes archived. */
export const DASHBOARD_EVENT_PAST_DAYS = 548;
export const DASHBOARD_EVENT_FUTURE_DAYS = 730;

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Same local-date window as {@link getEventsForDashboard} (for RPCs and API routes).
 */
export function getDashboardEventDateBounds(): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - DASHBOARD_EVENT_PAST_DAYS);
  const end = new Date(today);
  end.setDate(end.getDate() + DASHBOARD_EVENT_FUTURE_DAYS);
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
}

/**
 * Dashboard / kanban / analytics: avoid loading the full events history.
 */
export async function getEventsForDashboard(
  supabase: SupabaseClient
): Promise<Event[]> {
  const { start: startStr, end: endStr } = getDashboardEventDateBounds();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_archived", false)
    .gte("date", startStr)
    .lte("date", endStr)
    .order("date", { ascending: true });
  if (error) throw error;
  return data as Event[];
}

/**
 * Non-archived events whose `date` falls in the given calendar month (`YYYY-MM`).
 * For event-form / budget cap checks without loading all org events.
 */
export async function getEventBudgetSummariesForMonth(
  supabase: SupabaseClient,
  yearMonth: string
): Promise<EventBudgetPeer[]> {
  const ym = yearMonth.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ym)) return [];
  const monthStart = `${ym}-01`;
  const nextStart = firstDayOfNextCalendarMonth(ym);
  const { data, error } = await supabase
    .from("events")
    .select("id, date, location, location_key, planned_budget, is_archived")
    .eq("is_archived", false)
    .gte("date", monthStart)
    .lt("date", nextStart);
  if (error) throw error;
  const peers = (data ?? []) as Omit<EventBudgetPeer, "checklist_estimated_total">[];
  const ids = peers.map((p) => p.id);
  if (ids.length === 0) return [];

  const { data: costRows, error: costErr } = await supabase
    .from("checklist_items")
    .select("event_id, estimated_cost")
    .in("event_id", ids);
  if (costErr) throw costErr;

  const byEvent = new Map<string, number>();
  for (const row of costRows ?? []) {
    const r = row as { event_id: string; estimated_cost?: unknown };
    const add = Number(r.estimated_cost) || 0;
    byEvent.set(r.event_id, (byEvent.get(r.event_id) ?? 0) + add);
  }

  return peers.map((p) => ({
    ...p,
    checklist_estimated_total: byEvent.get(p.id) ?? 0,
  }));
}

export type { EventBudgetPeer };

export type ChecklistStats = Record<
  string,
  { total: number; completed: number }
>;

export async function getChecklistStatsForEvents(
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<ChecklistStats> {
  if (eventIds.length === 0) return {};

  const { data, error } = await supabase
    .from("checklist_items")
    .select("event_id, is_checked")
    .in("event_id", eventIds);
  if (error) throw error;

  const stats: ChecklistStats = {};
  for (const item of data) {
    if (!stats[item.event_id]) {
      stats[item.event_id] = { total: 0, completed: 0 };
    }
    stats[item.event_id].total++;
    if (item.is_checked) stats[item.event_id].completed++;
  }
  return stats;
}

export async function getEvent(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Event;
}

/** Browser mutations should use `@/lib/events-api-client` (API routes + validation). */

export async function createEvent(
  supabase: SupabaseClient,
  event: {
    name: string;
    date: string;
    location: string;
    owner: string;
    status: EventStatus;
    description: string;
    onedrive_link?: string;
    user_id: string;
    event_type?: EventType | null;
    planned_budget?: number | null;
    actual_budget?: number | null;
    event_goals?: string | null;
    core_activities?: string | null;
  }
) {
  const { data, error } = await supabase.rpc("create_event_with_checklist", {
    p_name: event.name,
    p_date: event.date,
    p_location: event.location,
    p_owner: event.owner,
    p_status: event.status,
    p_description: event.description,
    p_onedrive_link: event.onedrive_link ?? null,
    p_user_id: event.user_id,
    p_event_type: event.event_type ?? null,
    p_planned_budget: event.planned_budget ?? null,
    p_actual_budget: event.actual_budget ?? null,
    p_event_goals: event.event_goals ?? null,
    p_core_activities: event.core_activities ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error("create_event_with_checklist returned no row");
  }
  return row as Event;
}

export async function updateEvent(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Event>
) {
  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Event;
}

export async function deleteEvent(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

// Checklist operations
export async function getChecklistItems(supabase: SupabaseClient, eventId: string) {
  const { data, error } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    estimated_cost:
      (row as { estimated_cost?: number | null }).estimated_cost ?? null,
  })) as ChecklistItem[];
}

export async function updateChecklistItem(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<ChecklistItem>
) {
  const { data, error } = await supabase
    .from("checklist_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return {
    ...data,
    estimated_cost:
      (data as { estimated_cost?: number | null }).estimated_cost ?? null,
  } as ChecklistItem;
}

export async function addChecklistItem(
  supabase: SupabaseClient,
  item: {
    event_id: string;
    section: ChecklistSection;
    label: string;
    sort_order: number;
    estimated_cost?: number | null;
  }
) {
  const { data, error } = await supabase
    .from("checklist_items")
    .insert({
      ...item,
      estimated_cost: item.estimated_cost ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    ...data,
    estimated_cost:
      (data as { estimated_cost?: number | null }).estimated_cost ?? null,
  } as ChecklistItem;
}

export async function deleteChecklistItem(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("checklist_items").delete().eq("id", id);
  if (error) throw error;
}

// Document operations
export async function getEventDocuments(supabase: SupabaseClient, eventId: string) {
  const { data, error } = await supabase
    .from("event_documents")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as EventDocument[];
}

export async function uploadDocument(
  supabase: SupabaseClient,
  eventId: string,
  file: File,
  tag: DocumentTag,
  uploadedBy: string,
  /** When omitted, resolved from the Supabase session (first membership / client). */
  organizationId?: string | null
) {
  validateEventUploadFile(file);

  const orgId =
    organizationId ?? (await getCurrentOrganizationId(supabase));
  if (!orgId) throw new Error("No organization");

  const filePath = `${orgId}/${eventId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(EVENT_DOCUMENTS_BUCKET)
    .upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("event_documents")
    .insert({
      event_id: eventId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      tag,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data as EventDocument;
}

export async function deleteDocument(
  supabase: SupabaseClient,
  doc: EventDocument
) {
  await supabase.storage.from(EVENT_DOCUMENTS_BUCKET).remove([doc.file_path]);
  const { error } = await supabase
    .from("event_documents")
    .delete()
    .eq("id", doc.id);
  if (error) throw error;
}

/**
 * Time-limited read URL; requires an authenticated Supabase client that passes
 * storage RLS (org-scoped paths).
 */
export async function createSignedEventDocumentUrl(
  supabase: SupabaseClient,
  filePath: string,
  expiresInSeconds: number = EVENT_DOCUMENTS_SIGNED_URL_TTL_SECONDS,
  options?: { download?: string | boolean }
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(EVENT_DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds, options);
  if (error) {
    console.error("createSignedUrl:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/** Batch signed URLs for gallery grids (same TTL). */
export async function createSignedEventDocumentUrls(
  supabase: SupabaseClient,
  filePaths: string[],
  expiresInSeconds: number = EVENT_DOCUMENTS_SIGNED_URL_TTL_SECONDS
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(filePaths)].filter(Boolean);
  if (unique.length === 0) return map;

  const { data, error } = await supabase.storage
    .from(EVENT_DOCUMENTS_BUCKET)
    .createSignedUrls(unique, expiresInSeconds);

  if (error) {
    console.error("createSignedUrls:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    if (row.path && row.signedUrl && !row.error) {
      map.set(row.path, row.signedUrl);
    }
  }
  return map;
}

// Comment operations
export async function getEventComments(supabase: SupabaseClient, eventId: string) {
  const { data, error } = await supabase
    .from("event_comments")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as EventComment[];
}

export async function addComment(
  supabase: SupabaseClient,
  comment: {
    event_id: string;
    user_id: string;
    user_email: string;
    content: string;
  }
) {
  const { data, error } = await supabase
    .from("event_comments")
    .insert(comment)
    .select()
    .single();
  if (error) throw error;
  return data as EventComment;
}

export async function deleteComment(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("event_comments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Media operations
export async function getEventMedia(supabase: SupabaseClient, eventId: string) {
  const { data, error } = await supabase
    .from("event_media")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as EventMedia[];
}

export async function uploadMedia(
  supabase: SupabaseClient,
  eventId: string,
  file: File,
  tag: MediaTag,
  uploadedBy: string,
  organizationId?: string | null
) {
  validateEventUploadFile(file);

  const orgId =
    organizationId ?? (await getCurrentOrganizationId(supabase));
  if (!orgId) throw new Error("No organization");

  const filePath = `${orgId}/${eventId}/media/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(EVENT_DOCUMENTS_BUCKET)
    .upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("event_media")
    .insert({
      event_id: eventId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      tag,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data as EventMedia;
}

export async function deleteMedia(supabase: SupabaseClient, media: EventMedia) {
  await supabase.storage.from(EVENT_DOCUMENTS_BUCKET).remove([media.file_path]);
  const { error } = await supabase
    .from("event_media")
    .delete()
    .eq("id", media.id);
  if (error) throw error;
}

