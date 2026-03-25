"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  updateChecklistItem,
  addComment,
  uploadMedia,
} from "@/lib/events";
import type { ChecklistItem } from "@/types/database";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ImagePlus,
  MessageSquarePlus,
  Loader2,
} from "lucide-react";

interface EventMobileActionBarProps {
  eventId: string;
  checklist: ChecklistItem[];
  onUpdate: () => void;
}

export function EventMobileActionBar({
  eventId,
  checklist,
  onUpdate,
}: EventMobileActionBarProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const incomplete = checklist.filter((i) => !i.is_checked);

  async function markComplete(item: ChecklistItem) {
    setTogglingId(item.id);
    try {
      await updateChecklistItem(supabase, item.id, { is_checked: true });
      onUpdate();
      setTaskModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email || "unknown";
      for (const file of Array.from(files)) {
        await uploadMedia(supabase, eventId, file, "social_media", email);
      }
      onUpdate();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      await addComment(supabase, {
        event_id: eventId,
        user_id: user.id,
        user_email: user.email || "unknown",
        content: commentText.trim(),
      });
      setCommentText("");
      setCommentModalOpen(false);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setCommentSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[35] border-t border-harley-gray/70 bg-harley-dark/95 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.45)]"
        style={{
          paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))",
        }}
      >
        <nav
          className="flex items-stretch justify-around gap-1 px-2 pt-2 max-w-lg mx-auto"
          aria-label="Quick actions"
        >
          <button
            type="button"
            onClick={() => setTaskModalOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2.5 min-h-[3.5rem] text-harley-text-muted hover:text-harley-orange hover:bg-harley-gray-light/30 active:bg-harley-gray-light/50 transition-colors"
          >
            <CheckCircle2 className="w-6 h-6" aria-hidden />
            <span className="text-[11px] font-medium leading-tight text-center">
              Mark complete
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2.5 min-h-[3.5rem] text-harley-text-muted hover:text-harley-orange hover:bg-harley-gray-light/30 active:bg-harley-gray-light/50 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-harley-orange" />
            ) : (
              <ImagePlus className="w-6 h-6" aria-hidden />
            )}
            <span className="text-[11px] font-medium leading-tight text-center">
              Upload media
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCommentModalOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2.5 min-h-[3.5rem] text-harley-text-muted hover:text-harley-orange hover:bg-harley-gray-light/30 active:bg-harley-gray-light/50 transition-colors"
          >
            <MessageSquarePlus className="w-6 h-6" aria-hidden />
            <span className="text-[11px] font-medium leading-tight text-center">
              Add comment
            </span>
          </button>
        </nav>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Mark a task complete"
        size="md"
      >
        {incomplete.length === 0 ? (
          <p className="text-sm text-harley-text-muted text-center py-6">
            All checklist tasks are complete.
          </p>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto -mx-1 px-1">
            {incomplete.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => markComplete(item)}
                  disabled={togglingId === item.id}
                  className="w-full text-left rounded-xl border border-harley-gray/80 bg-harley-gray-light/20 px-4 py-3.5 flex items-start gap-3 hover:border-harley-orange/50 hover:bg-harley-orange/5 transition-colors disabled:opacity-60"
                >
                  <span className="mt-0.5 w-6 h-6 rounded-md border-2 border-harley-gray-lighter shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-wide text-harley-text-muted block mb-0.5">
                      {item.section}
                    </span>
                    <span className="text-base text-harley-text font-medium leading-snug">
                      {item.label}
                    </span>
                  </span>
                  {togglingId === item.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-harley-orange shrink-0" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        isOpen={commentModalOpen}
        onClose={() => {
          setCommentModalOpen(false);
          setCommentText("");
        }}
        title="Add comment"
        size="sm"
      >
        <form onSubmit={handleCommentSubmit} className="space-y-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write your comment…"
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-base placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 resize-none"
          />
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={commentSubmitting || !commentText.trim()}
          >
            {commentSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Post comment
          </Button>
        </form>
      </Modal>
    </>
  );
}
