import type { SupabaseClient } from "@supabase/supabase-js";
import { EVENT_DOCUMENTS_BUCKET } from "@/lib/events";
import { getCurrentOrganizationId } from "@/lib/organization";
import { validateEventUploadFile } from "@/lib/validation/upload-file";
import type { DocumentTag, EventDocument } from "@/types/database";

/**
 * Upload an event document from the browser straight to Supabase Storage + DB.
 * Avoids proxying file bytes through the Next.js API (Vercel body limits / timeouts).
 */
export async function uploadEventDocumentClient(
  supabase: SupabaseClient,
  eventId: string,
  file: File,
  tag: DocumentTag,
  organizationId?: string | null
): Promise<EventDocument> {
  validateEventUploadFile(file);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const orgId =
    organizationId ?? (await getCurrentOrganizationId(supabase));
  if (!orgId) throw new Error("No organization selected.");

  const filePath = `${orgId}/${eventId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(EVENT_DOCUMENTS_BUCKET)
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("event_documents")
    .insert({
      event_id: eventId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      tag,
      uploaded_by: user.email ?? user.id,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return data as EventDocument;
}
