import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { createEvent } from "@/lib/events";
import { eventCreateSchema } from "@/lib/validation/event-mutation-schemas";
import { parseWithSchema, readJsonBody } from "@/lib/validation/request-json";

export async function POST(request: Request) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(eventCreateSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  const {
    name,
    date,
    location,
    owner,
    status,
    description,
    onedrive_link,
    event_type,
    planned_budget,
    actual_budget,
    event_goals,
    core_activities,
    giveaway_description,
    giveaway_link,
    rsvp_incentive,
    rsvp_link,
  } = parsed.data;

  try {
    const row = await createEvent(ctx.supabase, {
      name,
      date,
      location,
      owner,
      status,
      description,
      onedrive_link: onedrive_link?.trim() || undefined,
      user_id: ctx.user.id,
      event_type: event_type ?? null,
      planned_budget: planned_budget ?? null,
      actual_budget: actual_budget ?? null,
      event_goals: event_goals ?? null,
      core_activities: core_activities ?? null,
      giveaway_description: giveaway_description ?? null,
      giveaway_link: giveaway_link ?? null,
      rsvp_incentive: rsvp_incentive ?? null,
      rsvp_link: rsvp_link ?? null,
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error("POST /api/events:", e);
    return NextResponse.json({ error: "Failed to create event." }, { status: 500 });
  }
}
