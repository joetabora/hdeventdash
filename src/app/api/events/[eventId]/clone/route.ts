import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import {
  buildCloneChecklistRows,
  buildCloneEventInsert,
  buildCloneVendorRows,
} from "@/lib/event-clone";
import { eventCloneSchema } from "@/lib/validation/event-mutation-schemas";
import {
  parseUuidParam,
  parseWithSchema,
  readJsonBody,
} from "@/lib/validation/request-json";
import type { Event } from "@/types/database";

/**
 * POST /api/events/[eventId]/clone — duplicate an event as a fresh plan.
 *
 * Copies playbook content, checklist structure, and the active vendor lineup;
 * resets per-run state (checkmarks, marketing dates, recap, ROI). Documents,
 * media, comments, and swap-meet spots are not copied.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId } = await context.params;
  const idCheck = parseUuidParam(rawEventId, "event id");
  if (!idCheck.ok) return idCheck.response;

  const inOrg = await assertEventInOrganization(
    ctx.supabase,
    idCheck.id,
    ctx.organizationId
  );
  if (!inOrg.ok) return inOrg.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(eventCloneSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  try {
    const { data: source, error: sourceError } = await ctx.supabase
      .from("events")
      .select("*")
      .eq("id", idCheck.id)
      .single();
    if (sourceError) throw sourceError;

    const insertPayload = buildCloneEventInsert(source as Event, {
      name: parsed.data.name,
      date: parsed.data.date,
      userId: ctx.user.id,
    });

    const { data: created, error: insertError } = await ctx.supabase
      .from("events")
      .insert(insertPayload)
      .select()
      .single();
    if (insertError) throw insertError;
    const clone = created as Event;

    try {
      const { data: checklist, error: checklistError } = await ctx.supabase
        .from("checklist_items")
        .select("section, label, assignee, estimated_cost, sort_order")
        .eq("event_id", idCheck.id)
        .order("sort_order", { ascending: true });
      if (checklistError) throw checklistError;

      const checklistRows = buildCloneChecklistRows(checklist ?? [], clone.id);
      if (checklistRows.length > 0) {
        const { error } = await ctx.supabase
          .from("checklist_items")
          .insert(checklistRows);
        if (error) throw error;
      }

      const { data: vendorLinks, error: vendorError } = await ctx.supabase
        .from("event_vendors")
        .select("vendor_id, role, notes, agreed_fee, fee_notes, detached_at")
        .eq("event_id", idCheck.id);
      if (vendorError) throw vendorError;

      const vendorRows = buildCloneVendorRows(vendorLinks ?? [], clone.id);
      if (vendorRows.length > 0) {
        const { error } = await ctx.supabase
          .from("event_vendors")
          .insert(vendorRows);
        if (error) throw error;
      }
    } catch (childError) {
      // Children failed — remove the half-built clone (cascade cleans up).
      await ctx.supabase.from("events").delete().eq("id", clone.id);
      throw childError;
    }

    return NextResponse.json(clone);
  } catch (e) {
    console.error("POST /api/events/[eventId]/clone:", e);
    return NextResponse.json(
      { error: "Failed to duplicate event." },
      { status: 500 }
    );
  }
}
