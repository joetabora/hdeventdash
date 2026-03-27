"use client";

import { EventDocument, EventMedia } from "@/types/database";
import { Image as ImageIcon } from "lucide-react";
import { CollapsibleSection } from "./collapsible-section";
import { DynamicEventMediaModuleInner } from "./lazy-event-detail-components";

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
      key={`media-${eventId}`}
      icon={<ImageIcon className="w-4.5 h-4.5" />}
      title="Files & Media"
      count={(media?.length ?? 0) + (documents?.length ?? 0)}
      autoOpenOnDesktop
      mobileCollapsed
      deferHeavyContent
    >
      <DynamicEventMediaModuleInner
        eventId={eventId}
        media={media}
        documents={documents}
        canMutate={canMutate}
        onMediaInvalidate={onMediaInvalidate}
        onDocumentsInvalidate={onDocumentsInvalidate}
      />
    </CollapsibleSection>
  );
}
