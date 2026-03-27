import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentOrganizationId } from "@/lib/organization";

export async function assertEventInOrganization(
  supabase: SupabaseClient,
  eventId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const orgId = await getCurrentOrganizationId(supabase);
  if (!orgId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No organization." }, { status: 400 }),
    };
  }

  const { data: ev, error } = await supabase
    .from("events")
    .select("id, organization_id")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("assertEventInOrganization:", error);
    return {
      ok: false,
      response: NextResponse.json({ error: "Lookup failed." }, { status: 500 }),
    };
  }

  if (!ev || ev.organization_id !== orgId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Event not found." }, { status: 404 }),
    };
  }

  return { ok: true };
}

export async function assertChecklistItemForEvent(
  supabase: SupabaseClient,
  eventId: string,
  itemId: string
): Promise<
  | { ok: true; item: { id: string; event_id: string } }
  | { ok: false; response: NextResponse }
> {
  const orgCheck = await assertEventInOrganization(supabase, eventId);
  if (!orgCheck.ok) return orgCheck;

  const { data: row, error } = await supabase
    .from("checklist_items")
    .select("id, event_id")
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    console.error("assertChecklistItemForEvent:", error);
    return {
      ok: false,
      response: NextResponse.json({ error: "Lookup failed." }, { status: 500 }),
    };
  }

  if (!row || row.event_id !== eventId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Checklist item not found." }, { status: 404 }),
    };
  }

  return { ok: true, item: row };
}

export async function assertCommentForEvent(
  supabase: SupabaseClient,
  eventId: string,
  commentId: string
): Promise<
  | { ok: true; comment: { id: string; event_id: string } }
  | { ok: false; response: NextResponse }
> {
  const orgCheck = await assertEventInOrganization(supabase, eventId);
  if (!orgCheck.ok) return orgCheck;

  const { data: row, error } = await supabase
    .from("event_comments")
    .select("id, event_id")
    .eq("id", commentId)
    .maybeSingle();

  if (error) {
    console.error("assertCommentForEvent:", error);
    return {
      ok: false,
      response: NextResponse.json({ error: "Lookup failed." }, { status: 500 }),
    };
  }

  if (!row || row.event_id !== eventId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Comment not found." }, { status: 404 }),
    };
  }

  return { ok: true, comment: row };
}

export async function loadEventDocumentForEvent(
  supabase: SupabaseClient,
  eventId: string,
  documentId: string
) {
  const orgCheck = await assertEventInOrganization(supabase, eventId);
  if (!orgCheck.ok) return orgCheck;

  const { data: doc, error } = await supabase
    .from("event_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    console.error("loadEventDocumentForEvent:", error);
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Lookup failed." }, { status: 500 }),
    };
  }

  if (!doc || doc.event_id !== eventId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Document not found." }, { status: 404 }),
    };
  }

  return { ok: true as const, doc };
}

export async function loadEventMediaForEvent(
  supabase: SupabaseClient,
  eventId: string,
  mediaId: string
) {
  const orgCheck = await assertEventInOrganization(supabase, eventId);
  if (!orgCheck.ok) return orgCheck;

  const { data: row, error } = await supabase
    .from("event_media")
    .select("*")
    .eq("id", mediaId)
    .maybeSingle();

  if (error) {
    console.error("loadEventMediaForEvent:", error);
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Lookup failed." }, { status: 500 }),
    };
  }

  if (!row || row.event_id !== eventId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Media not found." }, { status: 404 }),
    };
  }

  return { ok: true as const, media: row };
}
