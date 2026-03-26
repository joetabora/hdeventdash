"use client";

import { DocumentManager } from "@/components/events/document-manager";
import { MediaGallery } from "@/components/events/media-gallery";
import { EventDocument, EventMedia } from "@/types/database";
import { Image as ImageIcon } from "lucide-react";
import { CollapsibleSection } from "./collapsible-section";

export function EventMediaModule({
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
    <CollapsibleSection
      icon={<ImageIcon className="w-4.5 h-4.5" />}
      title="Files & Media"
      count={(media?.length ?? 0) + (documents?.length ?? 0)}
      autoOpenOnDesktop
      mobileCollapsed
    >
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
    </CollapsibleSection>
  );
}
