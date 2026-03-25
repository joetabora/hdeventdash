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
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="bg-harley-dark rounded-xl border border-harley-gray overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-harley-gray/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-harley-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-harley-text-muted" />
          )}
          <h3 className="font-semibold text-harley-text">{section}</h3>
          <span className="text-xs text-harley-text-muted">
            {checkedCount}/{items.length}
          </span>
        </div>
        <div className="w-24 h-2 bg-harley-gray rounded-full overflow-hidden">
          <div
            className="h-full bg-harley-orange rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-4 space-y-2">
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
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                placeholder="New checklist item..."
                autoFocus
                className="flex-1 px-3 py-1.5 rounded-lg bg-harley-gray border border-harley-gray-lighter text-harley-text text-sm placeholder-harley-text-muted focus:outline-none focus:border-harley-orange"
              />
              <Button size="sm" onClick={handleAddItem}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
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
              className="flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              Add item
            </button>
          )}
        </div>
      )}
    </div>
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
  const [assigneeInput, setAssigneeInput] = useState(item.assignee || "");
  const [commentInput, setCommentInput] = useState(item.comment || "");

  return (
    <div className="group">
      <div className="flex items-center gap-3 py-1.5">
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            item.is_checked
              ? "bg-harley-orange border-harley-orange"
              : "border-harley-gray-lighter hover:border-harley-orange"
          }`}
        >
          {item.is_checked && <Check className="w-3 h-3 text-white" />}
        </button>

        <span
          className={`flex-1 text-sm ${
            item.is_checked
              ? "line-through text-harley-text-muted"
              : "text-harley-text"
          }`}
        >
          {item.label}
        </span>

        {item.assignee && (
          <span className="text-xs text-harley-text-muted flex items-center gap-1">
            <User className="w-3 h-3" />
            {item.assignee}
          </span>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 text-harley-text-muted hover:text-harley-orange transition-colors"
            title="Details"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-harley-text-muted hover:text-harley-danger transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="ml-8 pl-3 border-l-2 border-harley-gray space-y-2 py-2">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-harley-text-muted shrink-0" />
            <input
              type="text"
              value={assigneeInput}
              onChange={(e) => setAssigneeInput(e.target.value)}
              onBlur={() => onAssigneeChange(assigneeInput)}
              placeholder="Assign to..."
              className="flex-1 px-2 py-1 rounded bg-harley-gray border border-harley-gray-lighter text-harley-text text-xs placeholder-harley-text-muted focus:outline-none focus:border-harley-orange"
            />
          </div>
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-harley-text-muted shrink-0 mt-1" />
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onBlur={() => onCommentChange(commentInput)}
              placeholder="Add a note..."
              className="flex-1 px-2 py-1 rounded bg-harley-gray border border-harley-gray-lighter text-harley-text text-xs placeholder-harley-text-muted focus:outline-none focus:border-harley-orange"
            />
          </div>
        </div>
      )}
    </div>
  );
}
