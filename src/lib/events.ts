import { SupabaseClient } from "@supabase/supabase-js";
import {
  Event,
  EventStatus,
  ChecklistItem,
  EventDocument,
  EventComment,
  EventMedia,
  DEFAULT_CHECKLIST_ITEMS,
  ChecklistSection,
  DocumentTag,
  MediaTag,
} from "@/types/database";
import { getCurrentOrganizationId } from "@/lib/organization";

export async function getEvents(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return data as Event[];
}

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
  }
) {
  const { data, error } = await supabase
    .from("events")
    .insert(event)
    .select()
    .single();
  if (error) throw error;

  // Create default checklist items
  const checklistItems = Object.entries(DEFAULT_CHECKLIST_ITEMS).flatMap(
    ([section, items]) =>
      items.map((label, idx) => ({
        event_id: data.id,
        section,
        label,
        sort_order: idx,
      }))
  );

  const { error: checklistError } = await supabase
    .from("checklist_items")
    .insert(checklistItems);
  if (checklistError) throw checklistError;

  return data as Event;
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
  return data as ChecklistItem[];
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
  return data as ChecklistItem;
}

export async function addChecklistItem(
  supabase: SupabaseClient,
  item: {
    event_id: string;
    section: ChecklistSection;
    label: string;
    sort_order: number;
  }
) {
  const { data, error } = await supabase
    .from("checklist_items")
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data as ChecklistItem;
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
  uploadedBy: string
) {
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) throw new Error("No organization");

  const filePath = `${organizationId}/${eventId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("event-documents")
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
  await supabase.storage.from("event-documents").remove([doc.file_path]);
  const { error } = await supabase
    .from("event_documents")
    .delete()
    .eq("id", doc.id);
  if (error) throw error;
}

export function getDocumentUrl(supabase: SupabaseClient, filePath: string) {
  const { data } = supabase.storage
    .from("event-documents")
    .getPublicUrl(filePath);
  return data.publicUrl;
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
  uploadedBy: string
) {
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) throw new Error("No organization");

  const filePath = `${organizationId}/${eventId}/media/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("event-documents")
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
  await supabase.storage.from("event-documents").remove([media.file_path]);
  const { error } = await supabase
    .from("event_media")
    .delete()
    .eq("id", media.id);
  if (error) throw error;
}

export function getMediaUrl(supabase: SupabaseClient, filePath: string) {
  const { data } = supabase.storage
    .from("event-documents")
    .getPublicUrl(filePath);
  return data.publicUrl;
}
