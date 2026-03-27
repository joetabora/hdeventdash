"use client";

import { DocumentManager } from "@/components/events/document-manager";
import { MediaGallery } from "@/components/events/media-gallery";
import type { EventDocument, EventMedia } from "@/types/database";

export function EventMediaModuleInner({
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <MediaGallery
        eventId={eventId}
        media={media}
        onUpdate={onMediaInvalidate}
        canMutate={canMutate}
      />
      <DocumentManager
        eventId={eventId}
        documents={documents}
        onUpdate={onDocumentsInvalidate}
        canMutate={canMutate}
      />
    </div>
  );
}
