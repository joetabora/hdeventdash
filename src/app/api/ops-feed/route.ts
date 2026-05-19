import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import { createOpsFeedEntry, listOpsFeedEntries } from "@/lib/ops-feed";
import {
  opsFeedEntryCreateSchema,
  opsFeedListQuerySchema,
} from "@/lib/validation/ops-feed-schemas";
import { parseWithSchema, readJsonBody } from "@/lib/validation/request-json";
import type { OpsFeedPriority, OpsFeedEntryStatus } from "@/types/database";

function parseListQuery(request: Request) {
  const { searchParams } = new URL(request.url);
  return parseWithSchema(opsFeedListQuerySchema, {
    page: searchParams.get("page") ?? "1",
    pageSize: searchParams.get("pageSize") ?? "30",
    q: searchParams.get("q") ?? "",
    tag: searchParams.get("tag") ?? "",
    priority: searchParams.get("priority") ?? "",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    status: searchParams.get("status") ?? "active",
  });
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  if (!session.organizationId) {
    return NextResponse.json(
      { error: "No organization selected." },
      { status: 403 }
    );
  }

  const parsed = parseListQuery(request);
  if (!parsed.ok) return parsed.response;

  const { page, pageSize, q, tag, priority, dateFrom, dateTo, status } =
    parsed.data;

  try {
    const result = await listOpsFeedEntries(
      session.supabase,
      session.organizationId,
      {
        page,
        pageSize,
        search: q,
        tag,
        priority: priority as OpsFeedPriority | "",
        dateFrom,
        dateTo,
        status: status as OpsFeedEntryStatus | "",
      }
    );
    const hasMore = result.page * result.pageSize < result.total;
    return NextResponse.json({ ...result, hasMore });
  } catch (e) {
    console.error("GET /api/ops-feed:", e);
    return NextResponse.json(
      { error: "Failed to list ops feed entries." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  if (!session.organizationId) {
    return NextResponse.json(
      { error: "No organization selected." },
      { status: 403 }
    );
  }

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = parseWithSchema(opsFeedEntryCreateSchema, raw.body);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.event_id) {
    const inOrg = await assertEventInOrganization(
      session.supabase,
      parsed.data.event_id,
      session.organizationId
    );
    if (!inOrg.ok) return inOrg.response;
  }

  try {
    const entry = await createOpsFeedEntry(session.supabase, {
      organization_id: session.organizationId,
      content: parsed.data.content,
      title: parsed.data.title,
      entry_type: parsed.data.entry_type,
      priority: parsed.data.priority,
      tags: parsed.data.tags ?? [],
      event_id: parsed.data.event_id ?? null,
      status: parsed.data.status,
      created_by: session.user.id,
      created_by_email: session.user.email ?? "",
    });
    return NextResponse.json(entry);
  } catch (e) {
    console.error("POST /api/ops-feed:", e);
    return NextResponse.json(
      { error: "Failed to create ops feed entry." },
      { status: 500 }
    );
  }
}
