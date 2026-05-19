"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { OpsFeedEntryWithEvent, OpsFeedPriority } from "@/types/database";
import { OPS_FEED_ENTRY_TYPES } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  OpsFeedPriorityBadge,
  opsFeedPriorityDotClass,
} from "@/components/ops-feed/ops-feed-priority-badge";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  Flag,
  Trash2,
} from "lucide-react";

const entryTypeLabel = Object.fromEntries(
  OPS_FEED_ENTRY_TYPES.map((t) => [t.value, t.label])
) as Record<string, string>;

export function OpsFeedEntryCard({
  entry,
  onArchive,
  onResolve,
  onDelete,
  onPriorityChange,
  busy,
}: {
  entry: OpsFeedEntryWithEvent;
  onArchive: (id: string) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onPriorityChange: (id: string, priority: OpsFeedPriority) => void;
  busy?: boolean;
}) {
  const time = format(parseISO(entry.created_at), "h:mm a");
  const showTitle =
    entry.title.trim() &&
    entry.title.trim() !== entry.content.trim().split(/\r?\n/)[0]?.trim();

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex gap-3 p-3.5 md:p-4">
        <div
          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${opsFeedPriorityDotClass(entry.priority)}`}
          title={`Priority: ${entry.priority}`}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-harley-text-muted">
            <span>{time}</span>
            <span className="text-harley-text-muted/40">·</span>
            <span>{entryTypeLabel[entry.entry_type] ?? entry.entry_type}</span>
            {entry.created_by_email ? (
              <>
                <span className="text-harley-text-muted/40">·</span>
                <span className="truncate max-w-[10rem]" title={entry.created_by_email}>
                  {entry.created_by_email}
                </span>
              </>
            ) : null}
            <OpsFeedPriorityBadge priority={entry.priority} />
            {entry.status === "resolved" ? (
              <Badge variant="success">Resolved</Badge>
            ) : null}
          </div>

          {showTitle ? (
            <p className="font-medium text-harley-text text-sm">{entry.title}</p>
          ) : null}

          <p className="text-sm md:text-base text-harley-text whitespace-pre-wrap leading-relaxed">
            {entry.content}
          </p>

          {(entry.tags.length > 0 || entry.event) && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="orange" className="!text-[10px]">
                  #{tag}
                </Badge>
              ))}
              {entry.event ? (
                <Link
                  href={`/events/${entry.event.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-harley-orange hover:text-harley-orange-light transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {entry.event.name}
                </Link>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1 pt-1">
            {entry.status === "active" && (
              <>
                <QuickAction
                  label="Mark resolved"
                  icon={CheckCircle2}
                  onClick={() => onResolve(entry.id)}
                  disabled={busy}
                />
                <QuickAction
                  label="Archive"
                  icon={Archive}
                  onClick={() => onArchive(entry.id)}
                  disabled={busy}
                />
                {entry.priority !== "high" && entry.priority !== "urgent" && (
                  <QuickAction
                    label="Flag high"
                    icon={Flag}
                    onClick={() => onPriorityChange(entry.id, "high")}
                    disabled={busy}
                  />
                )}
              </>
            )}
            <QuickAction
              label="Delete"
              icon={Trash2}
              onClick={() => onDelete(entry.id)}
              disabled={busy}
              danger
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function QuickAction({
  label,
  icon: Icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
        danger
          ? "text-harley-danger/80 hover:bg-harley-danger/10 hover:text-harley-danger"
          : "text-harley-text-muted hover:bg-harley-gray-light/50 hover:text-harley-text"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
