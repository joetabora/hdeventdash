"use client";

import { CommentsSection } from "@/components/events/comments-section";
import { EventComment } from "@/types/database";
import { MessageSquare } from "lucide-react";
import { CollapsibleSection } from "./collapsible-section";

export function EventCommentsModule({
  eventId,
  comments,
  canManageEvents,
  onCommentsInvalidate,
}: {
  eventId: string;
  comments: EventComment[];
  canManageEvents: boolean;
  onCommentsInvalidate: () => void;
}) {
  return (
    <CollapsibleSection
      icon={<MessageSquare className="w-4.5 h-4.5" />}
      title="Comments"
      count={comments.length}
      autoOpenOnDesktop
      mobileCollapsed
    >
      <CommentsSection
        eventId={eventId}
        comments={comments}
        onUpdate={onCommentsInvalidate}
        canPost={canManageEvents}
        canDelete={canManageEvents}
      />
    </CollapsibleSection>
  );
}
