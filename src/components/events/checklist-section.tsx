"use client";

import { useState } from "react";
import { ChecklistItem, ChecklistSection as ChecklistSectionType } from "@/types/database";
import {
  apiAddChecklistItem,
  apiDeleteChecklistItem,
  apiPatchChecklistItem,
} from "@/lib/events-api-client";
import {
  Check,
  Plus,
  Trash2,
  User,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ChecklistSectionProps {
  section: ChecklistSectionType;
  items: ChecklistItem[];
  eventId: string;
  onUpdate: () => void;
  /** Event Live Mode: larger touch targets, no add/delete/details */
  liveMode?: boolean;
  /** When false (staff): add/remove rows and per-row delete hidden; progress fields still editable. */
  allowStructureEdit?: boolean;
}

export function ChecklistSectionComponent({
  section,
  items,
  eventId,
  onUpdate,
  liveMode = false,
  allowStructureEdit = true,
}: ChecklistSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const checkedCount = items.filter((i) => i.is_checked).length;
  const progress = items.length > 0 ? (checkedCount / items.length) * 100 : 0;

  async function handleToggle(item: ChecklistItem) {
    await apiPatchChecklistItem(eventId, item.id, {
      is_checked: !item.is_checked,
    });
    onUpdate();
  }

  async function handleAddItem() {
    if (!newItemLabel.trim()) return;
    await apiAddChecklistItem(eventId, {
      section,
      label: newItemLabel.trim(),
      sort_order: items.length,
    });
    setNewItemLabel("");
    setAddingItem(false);
    onUpdate();
  }

  async function handleDelete(id: string) {
    await apiDeleteChecklistItem(eventId, id);
    onUpdate();
  }

  async function handleAssigneeChange(item: ChecklistItem, assignee: string) {
    await apiPatchChecklistItem(eventId, item.id, {
      assignee: assignee || null,
    });
    onUpdate();
  }

  async function handleCommentChange(item: ChecklistItem, comment: string) {
    await apiPatchChecklistItem(eventId, item.id, {
      comment: comment || null,
    });
    onUpdate();
  }

  return (
    <Card
      padding="none"
      hover={!liveMode}
      className={`overflow-hidden ${liveMode ? "border-harley-orange/15 shadow-lg shadow-black/20" : ""}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between hover:bg-harley-gray/30 transition-colors ${
          liveMode
            ? "px-4 py-4 sm:px-5 sm:py-5 min-h-[3.5rem]"
            : "px-4 py-3.5 md:px-5 md:py-4"
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <ChevronRight
            className={`text-harley-text-muted transition-transform duration-200 shrink-0 ${
              liveMode ? "w-5 h-5" : "w-4 h-4"
            } ${isExpanded ? "rotate-90" : "rotate-0"}`}
          />
          <h3
            className={`font-semibold text-harley-text text-left ${
              liveMode ? "text-base sm:text-lg" : "text-sm md:text-base"
            }`}
          >
            {section}
          </h3>
          <span
            className={`text-harley-text-muted tabular-nums ${liveMode ? "text-sm sm:text-base" : "text-xs"}`}
          >
            {checkedCount}/{items.length}
          </span>
        </div>
        <div
          className={`bg-harley-gray rounded-full overflow-hidden shrink-0 ${
            liveMode ? "w-24 sm:w-32 h-2.5 sm:h-3" : "w-20 md:w-24 h-2"
          }`}
        >
          <div
            className="h-full bg-harley-orange rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </button>

      {isExpanded && (
        <div
          className={`animate-fade-in-up ${
            liveMode
              ? "px-3 pb-4 sm:px-4 sm:pb-5 space-y-2 sm:space-y-3"
              : "px-3 pb-3 md:px-5 md:pb-4 space-y-1 md:space-y-2"
          }`}
        >
          {items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              liveMode={liveMode}
              allowDelete={allowStructureEdit}
              onToggle={() => handleToggle(item)}
              onDelete={() => handleDelete(item.id)}
              onAssigneeChange={(val) => handleAssigneeChange(item, val)}
              onCommentChange={(val) => handleCommentChange(item, val)}
            />
          ))}

          {!liveMode && allowStructureEdit &&
            (addingItem ? (
              <div className="flex items-center gap-2 mt-2 pl-1">
                <input
                  type="text"
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  placeholder="New checklist item..."
                  autoFocus
                  className="flex-1 px-3 py-2.5 md:py-1.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-sm placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
                />
                <Button size="sm" onClick={handleAddItem} className="!py-2.5 md:!py-1.5">
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="!py-2.5 md:!py-1.5"
                  onClick={() => {
                    setAddingItem(false);
                    setNewItemLabel("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingItem(true)}
                className="flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange transition-colors mt-2 py-2 md:py-1 pl-1"
              >
                <Plus className="w-4 h-4" />
                Add item
              </button>
            ))}
        </div>
      )}
    </Card>
  );
}

function ChecklistItemRow({
  item,
  liveMode,
  allowDelete,
  onToggle,
  onDelete,
  onAssigneeChange,
  onCommentChange,
}: {
  item: ChecklistItem;
  liveMode: boolean;
  allowDelete: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAssigneeChange: (val: string) => void;
  onCommentChange: (val: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [justChecked, setJustChecked] = useState(false);
  const [assigneeInput, setAssigneeInput] = useState(item.assignee || "");
  const [commentInput, setCommentInput] = useState(item.comment || "");

  function handleToggle() {
    if (!item.is_checked) {
      setJustChecked(true);
      setTimeout(() => setJustChecked(false), 300);
    }
    onToggle();
  }

  if (liveMode) {
    return (
      <div className="rounded-xl px-2 py-2 sm:px-3 sm:py-2.5 bg-harley-black/40 border border-harley-gray/40">
        <div className="flex items-start gap-3 sm:gap-4 min-h-[3rem] sm:min-h-[3.25rem]">
          <button
            type="button"
            onClick={handleToggle}
            className={`mt-0.5 w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-[2.5px] flex items-center justify-center shrink-0 transition-all duration-200 ${
              justChecked ? "animate-check-pop" : ""
            } ${
              item.is_checked
                ? "bg-harley-orange border-harley-orange shadow-md shadow-harley-orange/25"
                : "border-harley-gray-lighter active:border-harley-orange"
            }`}
          >
            <Check
              className={`w-6 h-6 sm:w-6 sm:h-6 text-white transition-all duration-200 ${
                item.is_checked ? "opacity-100 scale-100" : "opacity-0 scale-50"
              }`}
            />
          </button>
          <div className="flex-1 min-w-0 pt-1">
            <span
              className={`block text-base sm:text-lg leading-snug transition-all duration-200 ${
                item.is_checked
                  ? "line-through text-harley-text-muted/70"
                  : "text-harley-text font-medium"
              }`}
            >
              {item.label}
            </span>
            {item.assignee && (
              <span className="mt-1 flex items-center gap-1.5 text-sm text-harley-text-muted">
                <User className="w-4 h-4 shrink-0" />
                {item.assignee}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-center gap-3 md:gap-3 py-2 md:py-1.5 rounded-lg px-1.5 -mx-1.5 hover:bg-harley-gray-light/20 transition-colors duration-150">
        <button
          type="button"
          onClick={handleToggle}
          className={`w-7 h-7 md:w-5 md:h-5 rounded-md md:rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
            justChecked ? "animate-check-pop" : ""
          } ${
            item.is_checked
              ? "bg-harley-orange border-harley-orange shadow-sm shadow-harley-orange/30"
              : "border-harley-gray-lighter hover:border-harley-orange hover:shadow-sm hover:shadow-harley-orange/20"
          }`}
        >
          <Check
            className={`w-4 h-4 md:w-3 md:h-3 text-white transition-all duration-200 ${
              item.is_checked ? "opacity-100 scale-100" : "opacity-0 scale-50"
            }`}
          />
        </button>

        <span
          className={`flex-1 text-sm transition-all duration-200 ${
            item.is_checked
              ? "line-through text-harley-text-muted/60"
              : "text-harley-text"
          }`}
        >
          {item.label}
        </span>

        {item.assignee && (
          <span className="hidden sm:flex text-xs text-harley-text-muted items-center gap-1">
            <User className="w-3 h-3" />
            {item.assignee}
          </span>
        )}

        <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-all duration-150">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 md:p-1.5 rounded-md text-harley-text-muted hover:text-harley-orange hover:bg-harley-gray-light/40 transition-all duration-150"
            title="Details"
          >
            <MessageSquare className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
          {allowDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 md:p-1.5 rounded-md text-harley-text-muted hover:text-harley-danger hover:bg-harley-danger/10 transition-all duration-150"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="ml-4 md:ml-8 pl-3 border-l-2 border-harley-gray space-y-2.5 md:space-y-2 py-2 animate-fade-in-up">
          {item.assignee && (
            <span className="flex sm:hidden text-xs text-harley-text-muted items-center gap-1 pb-1">
              <User className="w-3 h-3" />
              {item.assignee}
            </span>
          )}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 md:w-3.5 md:h-3.5 text-harley-text-muted shrink-0" />
            <input
              type="text"
              value={assigneeInput}
              onChange={(e) => setAssigneeInput(e.target.value)}
              onBlur={() => onAssigneeChange(assigneeInput)}
              placeholder="Assign to..."
              className="flex-1 px-3 py-2 md:px-2 md:py-1 rounded-lg md:rounded bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-sm md:text-xs placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 transition-all duration-150"
            />
          </div>
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 md:w-3.5 md:h-3.5 text-harley-text-muted shrink-0 mt-2 md:mt-1" />
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onBlur={() => onCommentChange(commentInput)}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 md:px-2 md:py-1 rounded-lg md:rounded bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-sm md:text-xs placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 transition-all duration-150"
            />
          </div>
        </div>
      )}
    </div>
  );
}
