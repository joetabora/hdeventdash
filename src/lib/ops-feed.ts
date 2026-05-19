import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OpsFeedEntry,
  OpsFeedEntryWithEvent,
  OpsFeedEntryType,
  OpsFeedPriority,
  OpsFeedEntryStatus,
} from "@/types/database";

export type OpsFeedListPage = {
  entries: OpsFeedEntryWithEvent[];
  total: number;
  page: number;
  pageSize: number;
  /** Distinct tags across active entries in org (for filter chips). */
  availableTags: string[];
};

export type OpsFeedListFilters = {
  page: number;
  pageSize: number;
  search: string;
  tag: string;
  priority: OpsFeedPriority | "";
  dateFrom: string;
  dateTo: string;
  status: OpsFeedEntryStatus | "";
};

function escapeIlikePattern(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function quotePostgrestIlikeValue(p: string): string {
  return `"${p.replace(/"/g, '""')}"`;
}

/** Derive a short title from content when none provided. */
export function deriveOpsFeedTitle(content: string, maxLen = 120): string {
  const line = content.trim().split(/\r?\n/)[0]?.trim() ?? "";
  if (line.length <= maxLen) return line;
  return `${line.slice(0, maxLen - 1)}…`;
}

const ENTRY_SELECT = "*";

export async function listOpsFeedTags(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("ops_feed_entries")
    .select("tags")
    .eq("organization_id", organizationId)
    .eq("status", "active");
  if (error) throw error;
  const set = new Set<string>();
  for (const row of data ?? []) {
    for (const tag of (row.tags as string[] | null) ?? []) {
      const t = tag.trim().toLowerCase();
      if (t) set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function listOpsFeedEntries(
  supabase: SupabaseClient,
  organizationId: string,
  filters: OpsFeedListFilters
): Promise<OpsFeedListPage> {
  const { page, pageSize, search, tag, priority, dateFrom, dateTo, status } =
    filters;
  const safePage = Math.max(1, page);
  const safeSize = Math.min(50, Math.max(1, pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let q = supabase
    .from("ops_feed_entries")
    .select(ENTRY_SELECT, { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (status) {
    q = q.eq("status", status);
  }

  if (priority) {
    q = q.eq("priority", priority);
  }

  if (tag.trim()) {
    q = q.contains("tags", [tag.trim().toLowerCase()]);
  }

  if (dateFrom) {
    q = q.gte("created_at", `${dateFrom}T00:00:00.000Z`);
  }

  if (dateTo) {
    q = q.lte("created_at", `${dateTo}T23:59:59.999Z`);
  }

  const term = search.trim();
  if (term.length > 0) {
    const p = `%${escapeIlikePattern(term)}%`;
    const qv = quotePostgrestIlikeValue(p);
    q = q.or(`title.ilike.${qv},content.ilike.${qv}`);
  }

  const [{ data, error, count }, availableTags] = await Promise.all([
    q.range(from, to),
    listOpsFeedTags(supabase, organizationId),
  ]);

  if (error) throw error;

  const entries = (data ?? []) as OpsFeedEntryWithEvent[];

  return {
    entries,
    total: count ?? 0,
    page: safePage,
    pageSize: safeSize,
    availableTags,
  };
}

export async function createOpsFeedEntry(
  supabase: SupabaseClient,
  row: {
    organization_id: string;
    content: string;
    title?: string;
    entry_type?: OpsFeedEntryType;
    priority?: OpsFeedPriority;
    tags?: string[];
    event_id?: string | null;
    status?: OpsFeedEntryStatus;
    created_by: string;
    created_by_email: string;
  }
): Promise<OpsFeedEntryWithEvent> {
  const title =
    row.title?.trim() || deriveOpsFeedTitle(row.content);
  const { data, error } = await supabase
    .from("ops_feed_entries")
    .insert({
      organization_id: row.organization_id,
      content: row.content.trim(),
      title,
      entry_type: row.entry_type ?? "note",
      priority: row.priority ?? "normal",
      tags: row.tags ?? [],
      event_id: row.event_id ?? null,
      status: row.status ?? "active",
      created_by: row.created_by,
      created_by_email: row.created_by_email,
    })
    .select(ENTRY_SELECT)
    .single();
  if (error) throw error;
  return data as OpsFeedEntryWithEvent;
}

export async function updateOpsFeedEntry(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<
    Pick<
      OpsFeedEntry,
      | "title"
      | "content"
      | "entry_type"
      | "priority"
      | "tags"
      | "event_id"
      | "status"
    >
  >
): Promise<OpsFeedEntryWithEvent> {
  const { data, error } = await supabase
    .from("ops_feed_entries")
    .update(updates)
    .eq("id", id)
    .select(ENTRY_SELECT)
    .single();
  if (error) throw error;
  return data as OpsFeedEntryWithEvent;
}

export async function deleteOpsFeedEntry(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("ops_feed_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getOpsFeedEntry(
  supabase: SupabaseClient,
  id: string,
  organizationId: string
): Promise<OpsFeedEntryWithEvent | null> {
  const { data, error } = await supabase
    .from("ops_feed_entries")
    .select(ENTRY_SELECT)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as OpsFeedEntryWithEvent;
}
