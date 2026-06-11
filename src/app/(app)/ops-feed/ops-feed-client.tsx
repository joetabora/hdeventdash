"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Event,
  OpsFeedEntryStatus,
  OpsFeedEntryWithEvent,
  OpsFeedPriority,
} from "@/types/database";
import {
  apiCreateOpsFeedEntry,
  apiDeleteOpsFeedEntry,
  apiListOpsFeed,
  apiPatchOpsFeedEntry,
} from "@/lib/ops-feed-api-client";
import {
  enrichOpsFeedEntries,
  groupOpsFeedByDay,
} from "@/lib/ops-feed-utils";
import { OpsFeedQuickAdd } from "@/components/ops-feed/ops-feed-quick-add";
import { OpsFeedFilters } from "@/components/ops-feed/ops-feed-filters";
import { OpsFeedEntryCard } from "@/components/ops-feed/ops-feed-entry-card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Loader2, Radio } from "lucide-react";
import { showError } from "@/lib/toast";

const PAGE_SIZE = 30;

export function OpsFeedClient({
  initialEntries,
  initialTotal,
  initialAvailableTags,
  events,
}: {
  initialEntries: OpsFeedEntryWithEvent[];
  initialTotal: number;
  initialAvailableTags: string[];
  events: Event[];
}) {
  const [entries, setEntries] = useState(() =>
    enrichOpsFeedEntries(initialEntries, events)
  );
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [availableTags, setAvailableTags] = useState(initialAvailableTags);
  const [listLoading, setListLoading] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tag, setTag] = useState("");
  const [priority, setPriority] = useState<OpsFeedPriority | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState<OpsFeedEntryStatus | "">("active");

  const skipInitialFetch = useRef(true);
  const { confirm, confirmDialog } = useConfirm();

  const loadPage = useCallback(
    async (p: number, append = false) => {
      setListLoading(true);
      try {
        const res = await apiListOpsFeed({
          page: p,
          pageSize: PAGE_SIZE,
          q: debouncedSearch,
          tag,
          priority,
          dateFrom,
          dateTo,
          status,
        });
        const enriched = enrichOpsFeedEntries(res.entries, events);
        setEntries((prev) => (append ? [...prev, ...enriched] : enriched));
        setTotal(res.total);
        setPage(res.page);
        setAvailableTags(res.availableTags);
      } catch {
        showError("Failed to load ops feed.");
      } finally {
        setListLoading(false);
      }
    },
    [debouncedSearch, tag, priority, dateFrom, dateTo, status, events]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (skipInitialFetch.current && debouncedSearch === "" && !tag && !priority && !dateFrom && !dateTo && status === "active") {
      skipInitialFetch.current = false;
      return;
    }
    setPage(1);
    void loadPage(1);
  }, [debouncedSearch, tag, priority, dateFrom, dateTo, status, loadPage]);

  async function handleCreate(payload: Parameters<
    React.ComponentProps<typeof OpsFeedQuickAdd>["onSubmit"]
  >[0]) {
    try {
      const created = await apiCreateOpsFeedEntry(payload);
      const enriched = enrichOpsFeedEntries([created], events)[0]!;
      if (status === "active" || status === "") {
        setEntries((prev) => [enriched, ...prev]);
        setTotal((t) => t + 1);
      } else {
        void loadPage(1);
      }
      setAvailableTags((prev) => {
        const next = new Set(prev);
        for (const t of payload.tags) next.add(t);
        return [...next].sort((a, b) => a.localeCompare(b));
      });
    } catch {
      showError("Failed to save entry.");
      throw new Error("create failed");
    }
  }

  async function patchEntry(
    id: string,
    patch: Parameters<typeof apiPatchOpsFeedEntry>[1]
  ) {
    setActionBusyId(id);
    try {
      const updated = await apiPatchOpsFeedEntry(id, patch);
      const enriched = enrichOpsFeedEntries([updated], events)[0]!;
      if (status && status !== "active" && patch.status && patch.status !== status) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? enriched : e))
        );
      }
    } catch {
      showError("Failed to update entry.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Delete entry?",
      message: "This entry will be deleted permanently. This cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setActionBusyId(id);
    try {
      await apiDeleteOpsFeedEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      showError("Failed to delete entry.");
    } finally {
      setActionBusyId(null);
    }
  }

  const groups = groupOpsFeedByDay(entries);
  const hasMore = page * PAGE_SIZE < total;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16 md:pb-10">
      {confirmDialog}
      <PageHeader
        kicker="Field notes"
        title="Ops Feed"
        description="Your team's operational memory — ideas, call notes, and reminders in one searchable timeline."
      />

      <OpsFeedQuickAdd events={events} onSubmit={handleCreate} />

      <OpsFeedFilters
        search={search}
        onSearchChange={setSearch}
        tag={tag}
        onTagChange={setTag}
        priority={priority}
        onPriorityChange={setPriority}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        status={status}
        onStatusChange={setStatus}
        availableTags={availableTags}
      />

      <div className="relative min-h-[8rem] space-y-6">
        {listLoading ? (
          <div className="absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-surface-base/45 pt-8 backdrop-blur-[2px]">
            <Loader2 className="h-6 w-6 animate-spin text-harley-orange" aria-hidden />
          </div>
        ) : null}

        {!listLoading && groups.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No entries yet"
            description="Capture quick notes above — they anchor to dealerships and searchable tags."
          />
        ) : null}

        {!listLoading && groups.length > 0
          ? groups.map((group) => (
              <section key={group.dayKey} className="space-y-3">
                <h2 className="sticky top-14 z-[5] border-b border-border-subtle/70 bg-surface-base/75 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-harley-text-muted backdrop-blur-md">
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.entries.map((entry) => (
                    <OpsFeedEntryCard
                      key={entry.id}
                      entry={entry}
                      busy={actionBusyId === entry.id}
                      onArchive={(id) => void patchEntry(id, { status: "archived" })}
                      onResolve={(id) => void patchEntry(id, { status: "resolved" })}
                      onDelete={(id) => void handleDelete(id)}
                      onPriorityChange={(id, p) =>
                        void patchEntry(id, { priority: p })
                      }
                    />
                  ))}
                </div>
              </section>
            ))
          : null}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            onClick={() => void loadPage(page + 1, true)}
            disabled={listLoading}
          >
            {listLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
