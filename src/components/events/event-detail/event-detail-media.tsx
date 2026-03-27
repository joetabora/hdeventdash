"use client";

import { EventMediaModule } from "@/components/events/event-detail/event-media-module";
import type { EventDocument, EventMedia } from "@/types/database";

export function EventDetailMedia({
  eventId,
  media,
  documents,
  canMutate,
  onMediaInvalidate,
  onDocumentsInvalidate,
}: {
  eventId: string;
  media: EventMedia[];
  documents: EventDocument[];
  canMutate: boolean;
  onMediaInvalidate: () => void;
  onDocumentsInvalidate: () => void;
}) {
  return (
    <EventMediaModule
      eventId={eventId}
      media={media}
      documents={documents}
      canMutate={canMutate}
      onMediaInvalidate={onMediaInvalidate}
      onDocumentsInvalidate={onDocumentsInvalidate}
    />
  );
}
