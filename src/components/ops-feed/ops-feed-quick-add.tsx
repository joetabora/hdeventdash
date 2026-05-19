"use client";

import { useState } from "react";
import type { Event, OpsFeedEntryType, OpsFeedPriority } from "@/types/database";
import { OPS_FEED_ENTRY_TYPES, OPS_FEED_PRIORITIES } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { parseTagsInput } from "@/lib/ops-feed-utils";
import { ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";

export type OpsFeedQuickAddPayload = {
  content: string;
  entry_type: OpsFeedEntryType;
  priority: OpsFeedPriority;
  tags: string[];
  event_id: string | null;
};

export function OpsFeedQuickAdd({
  events,
  onSubmit,
  disabled,
}: {
  events: Event[];
  onSubmit: (payload: OpsFeedQuickAddPayload) => Promise<void>;
  disabled?: boolean;
}) {
  const [content, setContent] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [entryType, setEntryType] = useState<OpsFeedEntryType>("note");
  const [priority, setPriority] = useState<OpsFeedPriority>("normal");
  const [tagsRaw, setTagsRaw] = useState("");
  const [eventId, setEventId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        content: trimmed,
        entry_type: entryType,
        priority,
        tags: parseTagsInput(tagsRaw),
        event_id: eventId || null,
      });
      setContent("");
      setTagsRaw("");
      setEventId("");
      setEntryType("note");
      setPriority("normal");
      setShowDetails(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl border border-harley-gray/80 bg-harley-dark/60 shadow-[var(--shadow-card)] overflow-hidden"
    >
      <div className="p-3 md:p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Dump an idea, call note, reminder, or issue…"
          rows={3}
          disabled={disabled || submitting}
          className="w-full min-h-[5.5rem] md:min-h-[4.5rem] px-0 py-0 bg-transparent border-0 text-harley-text text-base leading-relaxed placeholder-harley-text-muted/60 focus:outline-none focus:ring-0 resize-y disabled:opacity-60"
          autoFocus
        />
      </div>

      {showDetails && (
        <div className="px-3 md:px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-harley-gray/50 pt-3">
          <Select
            label="Type"
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as OpsFeedEntryType)}
            disabled={disabled || submitting}
            options={OPS_FEED_ENTRY_TYPES}
          />
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as OpsFeedPriority)}
            disabled={disabled || submitting}
            options={OPS_FEED_PRIORITIES}
          />
          <div className="sm:col-span-2">
            <label className="block text-sm text-harley-text-muted mb-1.5">
              Tags
            </label>
            <input
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="vendor, sponsor, social (comma separated)"
              disabled={disabled || submitting}
              className="w-full px-4 py-2.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20"
            />
          </div>
          <div className="sm:col-span-2">
            <Select
              label="Link to event (optional)"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              disabled={disabled || submitting}
              options={[
                { value: "", label: "No event" },
                ...[...events]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((ev) => ({
                    value: ev.id,
                    label: `${ev.name} (${ev.date})`,
                  })),
              ]}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 md:px-4 py-2.5 border-t border-harley-gray/50 bg-harley-black/20">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-harley-text-muted hover:text-harley-orange transition-colors"
        >
          {showDetails ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
          {showDetails ? "Hide details" : "Add tags, priority, event…"}
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] text-harley-text-muted/70">
            ⌘/Ctrl + Enter to save
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={disabled || submitting || !content.trim()}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
