"use client";

import { useState } from "react";
import {
  apiAddComment,
  apiDeleteComment,
} from "@/lib/events-api-client";
import { EventComment } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Send } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { showError } from "@/lib/toast";

interface CommentsSectionProps {
  eventId: string;
  comments: EventComment[];
  onUpdate: () => void;
  canPost?: boolean;
  canDelete?: boolean;
}

export function CommentsSection({
  eventId,
  comments,
  onUpdate,
  canPost = true,
  canDelete = true,
}: CommentsSectionProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      await apiAddComment(eventId, content.trim());
      setContent("");
      onUpdate();
    } catch (err) {
      console.error("Failed to add comment:", err);
      showError("Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await apiDeleteComment(eventId, commentId);
      onUpdate();
    } catch (err) {
      console.error("Failed to delete comment:", err);
      showError("Failed to delete comment.");
    }
  }

  return (
    <Card className="!p-3.5 md:!p-5">
      <h3 className="font-semibold text-harley-text mb-4">Comments</h3>

      <div className="space-y-4 mb-4">
        {comments.length === 0 && (
          <p className="text-sm text-harley-text-muted text-center py-4">
            No comments yet
          </p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start sm:items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-harley-orange/20 flex items-center justify-center text-xs font-semibold text-harley-orange shrink-0">
                  {comment.user_email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-harley-text truncate block sm:inline">
                    {comment.user_email}
                  </span>
                  <span className="text-xs text-harley-text-muted sm:ml-2 block sm:inline">
                    {formatDistanceToNow(parseISO(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
              {canDelete && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 p-1.5 text-harley-text-muted hover:text-harley-danger transition-all shrink-0 rounded-md"
                >
                  <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                </button>
              )}
            </div>
            <p className="text-sm text-harley-text ml-9 mt-1">
              {comment.content}
            </p>
          </div>
        ))}
      </div>

      {canPost ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 md:px-4 py-2.5 md:py-2 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-sm placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
          />
          <Button type="submit" size="sm" disabled={submitting || !content.trim()} className="!p-2.5 md:!px-3 md:!py-1.5">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      ) : (
        <p className="text-xs text-harley-text-muted">
          Only managers and admins can post comments.
        </p>
      )}
    </Card>
  );
}
