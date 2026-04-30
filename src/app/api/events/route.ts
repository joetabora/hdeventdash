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

  const payload = parsed.data;

  try {
    const row = await createEvent(ctx.supabase, {
      ...payload,
      onedrive_link: payload.onedrive_link?.trim() || undefined,
      user_id: ctx.user.id,
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error("POST /api/events:", e);
    return NextResponse.json({ error: "Failed to create event." }, { status: 500 });
  }
}
