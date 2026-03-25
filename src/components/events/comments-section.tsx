"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addComment, deleteComment } from "@/lib/events";
import { EventComment } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Trash2, Send } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface CommentsSectionProps {
  eventId: string;
  comments: EventComment[];
  onUpdate: () => void;
}

export function CommentsSection({
  eventId,
  comments,
  onUpdate,
}: CommentsSectionProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await addComment(supabase, {
        event_id: eventId,
        user_id: user.id,
        user_email: user.email || "unknown",
        content: content.trim(),
      });
      setContent("");
      onUpdate();
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await deleteComment(supabase, commentId);
      onUpdate();
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  }

  return (
    <div className="bg-harley-dark rounded-xl border border-harley-gray p-5">
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
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-harley-orange/20 flex items-center justify-center text-xs font-semibold text-harley-orange">
                  {comment.user_email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-medium text-harley-text">
                    {comment.user_email}
                  </span>
                  <span className="text-xs text-harley-text-muted ml-2">
                    {formatDistanceToNow(parseISO(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(comment.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-harley-text-muted hover:text-harley-danger transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-harley-text ml-9 mt-1">
              {comment.content}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-4 py-2 rounded-lg bg-harley-gray border border-harley-gray-lighter text-harley-text text-sm placeholder-harley-text-muted focus:outline-none focus:border-harley-orange transition-colors"
        />
        <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
