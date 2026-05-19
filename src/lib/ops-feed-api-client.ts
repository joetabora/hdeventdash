import { apiFetchJson } from "@/lib/api/api-fetch-json";
import type {
  OpsFeedEntryWithEvent,
  OpsFeedEntryType,
  OpsFeedPriority,
  OpsFeedEntryStatus,
} from "@/types/database";

export type OpsFeedApiPage = {
  entries: OpsFeedEntryWithEvent[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  availableTags: string[];
};

export type OpsFeedCreateBody = {
  content: string;
  title?: string;
  entry_type?: OpsFeedEntryType;
  priority?: OpsFeedPriority;
  tags?: string[];
  event_id?: string | null;
  status?: OpsFeedEntryStatus;
};

export type OpsFeedPatchBody = Partial<
  Pick<
    OpsFeedEntryWithEvent,
    | "title"
    | "content"
    | "entry_type"
    | "priority"
    | "tags"
    | "event_id"
    | "status"
  >
>;

export async function apiListOpsFeed(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  tag?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}): Promise<OpsFeedApiPage> {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.pageSize != null) sp.set("pageSize", String(params.pageSize));
  if (params.q) sp.set("q", params.q);
  if (params.tag) sp.set("tag", params.tag);
  if (params.priority) sp.set("priority", params.priority);
  if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params.dateTo) sp.set("dateTo", params.dateTo);
  if (params.status) sp.set("status", params.status);
  const qs = sp.toString();
  return apiFetchJson<OpsFeedApiPage>(`/api/ops-feed${qs ? `?${qs}` : ""}`);
}

export async function apiCreateOpsFeedEntry(
  body: OpsFeedCreateBody
): Promise<OpsFeedEntryWithEvent> {
  return apiFetchJson<OpsFeedEntryWithEvent>("/api/ops-feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPatchOpsFeedEntry(
  id: string,
  body: OpsFeedPatchBody
): Promise<OpsFeedEntryWithEvent> {
  return apiFetchJson<OpsFeedEntryWithEvent>(`/api/ops-feed/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiDeleteOpsFeedEntry(id: string): Promise<void> {
  await apiFetchJson<{ ok: boolean }>(`/api/ops-feed/${id}`, {
    method: "DELETE",
  });
}
