"use client";

import { useState } from "react";
import { ChecklistItem, ChecklistSection as ChecklistSectionType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { updateChecklistItem, addChecklistItem, deleteChecklistItem } from "@/lib/events";
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
}

export function ChecklistSectionComponent({
  section,
  items,
  eventId,
  onUpdate,
}: ChecklistSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const supabase = createClient();

  const checkedCount = items.filter((i) => i.is_checked).length;
  const progress = items.length > 0 ? (checkedCount / items.length) * 100 : 0;

  async function handleToggle(item: ChecklistItem) {
    await updateChecklistItem(supabase, item.id, {
      is_checked: !item.is_checked,
    });
    onUpdate();
  }

  async function handleAddItem() {
    if (!newItemLabel.trim()) return;
    await addChecklistItem(supabase, {
      event_id: eventId,
      section,
      label: newItemLabel.trim(),
      sort_order: items.length,
    });
    setNewItemLabel("");
    setAddingItem(false);
    onUpdate();
  }

  async function handleDelete(id: string) {
    await deleteChecklistItem(supabase, id);
    onUpdate();
  }

  async function handleAssigneeChange(item: ChecklistItem, assignee: string) {
    await updateChecklistItem(supabase, item.id, {
      assignee: assignee || null,
    });
    onUpdate();
  }

  async function handleCommentChange(item: ChecklistItem, comment: string) {
    await updateChecklistItem(supabase, item.id, {
      comment: comment || null,
    });
    onUpdate();
  }

  return (
    <Card padding="none" hover className="overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3.5 md:px-5 md:py-4 hover:bg-harley-gray/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ChevronRight className={`w-4 h-4 text-harley-text-muted transition-transform duration-200 ${
            isExpanded ? "rotate-90" : "rotate-0"
          }`} />
          <h3 className="font-semibold text-harley-text text-sm md:text-base">{section}</h3>
          <span className="text-xs text-harley-text-muted">
            {checkedCount}/{items.length}
          </span>
        </div>
        <div className="w-20 md:w-24 h-2 bg-harley-gray rounded-full overflow-hidden">
          <div
            className="h-full bg-harley-orange rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 md:px-5 md:pb-4 space-y-1 md:space-y-2 animate-fade-in-up">
          {items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              onToggle={() => handleToggle(item)}
              onDelete={() => handleDelete(item.id)}
              onAssigneeChange={(val) => handleAssigneeChange(item, val)}
              onCommentChange={(val) => handleCommentChange(item, val)}
            />
          ))}

          {addingItem ? (
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
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange transition-colors mt-2 py-2 md:py-1 pl-1"
            >
              <Plus className="w-4 h-4" />
              Add item
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function ChecklistItemRow({
  item,
  onToggle,
  onDelete,
  onAssigneeChange,
  onCommentChange,
}: {
  item: ChecklistItem;
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

  return (
    <div className="group">
      <div className="flex items-center gap-3 md:gap-3 py-2 md:py-1.5 rounded-lg px-1.5 -mx-1.5 hover:bg-harley-gray-light/20 transition-colors duration-150">
        {/* Checkbox — larger touch target on mobile */}
        <button
          onClick={handleToggle}
          className={`w-7 h-7 md:w-5 md:h-5 rounded-md md:rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
            justChecked ? "animate-check-pop" : ""
          } ${
            item.is_checked
              ? "bg-harley-orange border-harley-orange shadow-sm shadow-harley-orange/30"
              : "border-harley-gray-lighter hover:border-harley-orange hover:shadow-sm hover:shadow-harley-orange/20"
          }`}
        >
          <Check className={`w-4 h-4 md:w-3 md:h-3 text-white transition-all duration-200 ${
            item.is_checked ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`} />
        </button>

        {/* Label */}
        <span
          className={`flex-1 text-sm transition-all duration-200 ${
            item.is_checked
              ? "line-through text-harley-text-muted/60"
              : "text-harley-text"
          }`}
        >
          {item.label}
        </span>

        {/* Assignee badge */}
        {item.assignee && (
          <span className="hidden sm:flex text-xs text-harley-text-muted items-center gap-1">
            <User className="w-3 h-3" />
            {item.assignee}
          </span>
        )}

        {/* Action buttons — always visible on mobile, hover on desktop */}
        <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-all duration-150">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 md:p-1.5 rounded-md text-harley-text-muted hover:text-harley-orange hover:bg-harley-gray-light/40 transition-all duration-150"
            title="Details"
          >
            <MessageSquare className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 md:p-1.5 rounded-md text-harley-text-muted hover:text-harley-danger hover:bg-harley-danger/10 transition-all duration-150"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded details panel */}
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
